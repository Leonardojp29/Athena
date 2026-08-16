import { Inject, Injectable, Logger } from '@nestjs/common';
import { slugify, type FootballDataProvider, type ProviderPlayer } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { bulkUpdatePlayers } from './bulk-upsert.js';
import { ExternalReferenceService } from './external-reference.service.js';

export interface PlayerSeed {
  providerRef: string;
  data: ProviderPlayer;
}

/* Tamaño de lote de las transacciones: el pooler cobra caro cada ida y vuelta. */
const LOTE = 100;

/** P2002: el índice único se quejó. Es el choque de dos obreros creando al mismo jugador. */
function esChoqueDeUnicidad(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

/** "J. Mosqueira", "Á. Di María": inicial con punto, que es como vienen las alineaciones. */
const ABREVIADO = /(?:^|\s)\p{L}\.(?:\s|$)/u;

/** "j-alarcon": el slug que dejó una alineación, con la inicial por delante. */
const SLUG_ABREVIADO = /^\p{L}-/u;

/**
 * Si el slug guardado hay que corregirlo con el nombre que acaba de llegar.
 *
 * Solo se toca el que nació abreviado, y solo cuando el nombre nuevo ya no lo es: un slug es una
 * URL y se cambia por una razón concreta, no porque el proveedor haya escrito distinto un acento.
 */
export function slugDesactualizado(slug: string, nombre: string): boolean {
  return SLUG_ABREVIADO.test(slug) && !ABREVIADO.test(nombre);
}

/**
 * El nombre no se degrada. `/players` trae "Joaquín Mosqueira" y `/fixtures/players` el mismo
 * jugador como "J. Mosqueira": si la alineación gana, la web entera pierde los nombres de pila.
 */
export function mejorNombre(actual: string, entrante: string): string {
  if (entrante === actual) return actual;
  if (ABREVIADO.test(entrante) && !ABREVIADO.test(actual)) return actual;
  return entrante;
}

/**
 * Único dueño de crear jugadores y de asignar slugs.
 *
 * Antes cada caso de uso creaba los suyos: el de plantillas escribía el jugador y su
 * referencia externa en dos await separados, así que una caída en el medio dejaba
 * huérfanos que la corrida siguiente volvía a crear duplicados. Acá van en la misma
 * transacción.
 *
 * El slug lo asigna esta clase y conviene que el jugador nazca de /players (nombre completo) y no
 * de una alineación, donde el proveedor manda "J. Alarcón". Cuando el nombre completo llega
 * después, el slug se corrige y el viejo queda como alias: una URL compartida no puede morir
 * porque nosotros mejoramos un dato.
 */
@Injectable()
export class PlayerResolverService {
  private readonly logger = new Logger(PlayerResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  /**
   * Devuelve el id de Athena para cada providerRef, creando los que falten y actualizando los que
   * ya existen con lo que el proveedor sepa ahora.
   *
   * Con varios obreros en paralelo, dos partidos distintos pueden traer al mismo jugador nuevo y
   * los dos intentan crearlo: el segundo se choca con el slug único y perdía el partido entero.
   * El reintento resuelve de nuevo, y en la segunda pasada el jugador ya existe.
   */
  async resolveMany(seeds: PlayerSeed[]): Promise<Map<string, string>> {
    try {
      return await this.resolverUnaVez(seeds);
    } catch (error) {
      if (!esChoqueDeUnicidad(error)) throw error;
      this.logger.warn('Otro proceso creó el mismo jugador; resolviendo de nuevo');
      return this.resolverUnaVez(seeds);
    }
  }

  private async resolverUnaVez(seeds: PlayerSeed[]): Promise<Map<string, string>> {
    if (seeds.length === 0) return new Map();

    const unicos = [...new Map(seeds.map((s) => [s.providerRef, s])).values()];
    const conocidos = await this.refs.resolveMany(
      this.provider.name,
      'player',
      unicos.map((s) => s.providerRef),
    );

    const nuevos = unicos.filter((s) => !conocidos.has(s.providerRef));
    if (nuevos.length > 0) {
      const slugs = await this.reserveSlugs(nuevos);
      for (let i = 0; i < nuevos.length; i += LOTE) {
        const lote = nuevos.slice(i, i + LOTE);
        const ids = await this.createLinked(lote, slugs);
        for (const [ref, id] of ids) conocidos.set(ref, id);
      }
      this.logger.log(`${nuevos.length} jugadores creados`);
    }

    const refsNuevos = new Set(nuevos.map((s) => s.providerRef));
    await this.refreshKnown(
      unicos.filter((s) => !refsNuevos.has(s.providerRef)),
      conocidos,
    );
    return conocidos;
  }

  /**
   * Por lotes y en una sola transacción. Una transacción por jugador sobre el pooler daba
   * más de un segundo por cabeza: seis mil futbolistas eran dos horas de round-trips.
   */
  private async createLinked(
    lote: PlayerSeed[],
    slugs: Map<string, string>,
  ): Promise<Map<string, string>> {
    return this.prisma.$transaction(async (tx) => {
      const creados = await tx.player.createManyAndReturn({
        data: lote.map((seed) => ({
          name: seed.data.name,
          slug: slugs.get(seed.providerRef) as string,
          fullName: seed.data.fullName,
          birthDate: seed.data.birthDate ? new Date(seed.data.birthDate) : null,
          nationality: seed.data.nationality,
          heightCm: seed.data.heightCm,
          position: seed.data.position,
          photoUrl: seed.data.photoUrl,
        })),
        select: { id: true },
      });
      await tx.externalReference.createMany({
        data: creados.map((player, i) => ({
          provider: this.provider.name,
          entityType: 'player',
          providerRef: lote[i]?.providerRef as string,
          entityId: player.id,
        })),
      });
      return new Map(creados.map((player, i) => [lote[i]?.providerRef as string, player.id]));
    });
  }

  /**
   * Nunca sobrescribe con null: una alineación sabe menos que /players. Compara antes de
   * escribir porque con seis mil jugadores un UPDATE por cabeza en cada corrida sería
   * media hora de round-trips para cambiar nada.
   */
  private async refreshKnown(seeds: PlayerSeed[], ids: Map<string, string>): Promise<void> {
    if (seeds.length === 0) return;

    const actuales = new Map(
      (
        await this.prisma.player.findMany({
          where: { id: { in: [...ids.values()] } },
          select: {
            id: true,
            slug: true,
            name: true,
            fullName: true,
            birthDate: true,
            nationality: true,
            heightCm: true,
            position: true,
            photoUrl: true,
          },
        })
      ).map((p) => [p.id, p]),
    );

    const cambiados: Array<Record<string, unknown>> = [];
    for (const seed of seeds) {
      const id = ids.get(seed.providerRef);
      const actual = id ? actuales.get(id) : undefined;
      if (!id || !actual) continue;

      const fecha = seed.data.birthDate ? new Date(seed.data.birthDate) : null;
      const nombre = mejorNombre(actual.name, seed.data.name);
      const distinto =
        nombre !== actual.name ||
        (!!seed.data.fullName && seed.data.fullName !== actual.fullName) ||
        (!!fecha && actual.birthDate?.getTime() !== fecha.getTime()) ||
        (!!seed.data.nationality && seed.data.nationality !== actual.nationality) ||
        (!!seed.data.heightCm && seed.data.heightCm !== actual.heightCm) ||
        (!!seed.data.position && seed.data.position !== actual.position) ||
        (!!seed.data.photoUrl && seed.data.photoUrl !== actual.photoUrl);
      if (!distinto) continue;

      /* COALESCE en el SQL: lo que el proveedor no sabe no borra lo que ya había. */
      cambiados.push({
        id,
        name: nombre,
        full_name: seed.data.fullName,
        birth_date: fecha,
        nationality: seed.data.nationality,
        height_cm: seed.data.heightCm,
        position: seed.data.position,
        photo_url: seed.data.photoUrl,
      });
    }

    if (cambiados.length === 0) return;
    await bulkUpdatePlayers(this.prisma, cambiados);
    this.logger.log(`${cambiados.length} jugadores actualizados`);

    /*
     * Y el slug sigue al nombre cuando deja de ser una inicial. Un futbolista que nace de una
     * alineación queda como `j-alarcon`, y hasta acá eso era para siempre porque un slug es una URL.
     * Con la tabla de alias ya no: el viejo queda apuntando al jugador y la ficha redirige, así que
     * el nombre completo puede llegar tarde sin condenar la dirección.
     */
    const aRenombrar = cambiados.filter((fila) => {
      const actual = actuales.get(fila.id as string);
      return actual !== undefined && slugDesactualizado(actual.slug, fila.name as string);
    });
    for (const fila of aRenombrar) {
      const actual = actuales.get(fila.id as string);
      if (!actual) continue;
      const nuevo = slugify((fila.full_name as string | null) ?? (fila.name as string));
      if (nuevo === '' || nuevo === actual.slug) continue;
      const tomado = await this.prisma.player.findUnique({ where: { slug: nuevo }, select: { id: true } });
      if (tomado) continue;

      await this.prisma.$transaction([
        this.prisma.slugAlias.upsert({
          where: { entityType_slug: { entityType: 'player', slug: actual.slug } },
          update: { entityId: actual.id },
          create: { entityType: 'player', slug: actual.slug, entityId: actual.id },
        }),
        this.prisma.player.update({ where: { id: actual.id }, data: { slug: nuevo } }),
      ]);
    }
    if (aRenombrar.length > 0) this.logger.log(`${aRenombrar.length} slugs al día con su nombre`);
  }

  /**
   * El nombre completo manda para el slug; el corto solo si no hay otro. Los homónimos
   * se desempatan con el ref del proveedor, que es estable.
   */
  private async reserveSlugs(seeds: PlayerSeed[]): Promise<Map<string, string>> {
    const bases = seeds.map((s) => slugify(s.data.fullName ?? s.data.name));
    const tomados = new Set(
      (
        await this.prisma.player.findMany({
          where: { slug: { in: bases } },
          select: { slug: true },
        })
      ).map((p) => p.slug),
    );

    const resultado = new Map<string, string>();
    for (const [i, seed] of seeds.entries()) {
      const base = bases[i] as string;
      const slug = !base || tomados.has(base) ? `${base}-${seed.providerRef}` : base;
      tomados.add(slug);
      tomados.add(base);
      resultado.set(seed.providerRef, slug);
    }
    return resultado;
  }
}
