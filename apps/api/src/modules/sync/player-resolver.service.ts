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

/**
 * Único dueño de crear jugadores y de asignar slugs.
 *
 * Antes cada caso de uso creaba los suyos: el de plantillas escribía el jugador y su
 * referencia externa en dos await separados, así que una caída en el medio dejaba
 * huérfanos que la corrida siguiente volvía a crear duplicados. Acá van en la misma
 * transacción.
 *
 * El slug se asigna una sola vez y no se cambia nunca porque es una URL: por eso conviene
 * que el jugador nazca de /players (nombre completo) y no de una alineación, donde el
 * proveedor manda "J. Alarcón".
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
   * Devuelve el id de Athena para cada providerRef, creando los que falten y
   * actualizando los que ya existen con lo que el proveedor sepa ahora.
   */
  async resolveMany(seeds: PlayerSeed[]): Promise<Map<string, string>> {
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
      const distinto =
        seed.data.name !== actual.name ||
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
        name: seed.data.name,
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
