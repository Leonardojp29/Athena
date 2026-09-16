import { Inject, Injectable, Logger } from '@nestjs/common';
import { esNombreAbreviado, esSlugAbreviado, slugify, type FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

export interface CoachSeed {
  providerRef: string;
  name: string;
  fullName?: string | null;
  photoUrl?: string | null;
  /**
   * Si el nombre viene de la ficha del proveedor, que es la que manda sobre quién es la persona.
   * El de una alineación es texto escrito al lado de un partido: puede refinar el que hay, nunca
   * reemplazarlo por el de otro.
   */
  deLaFicha?: boolean;
}

/**
 * El nombre que se muestra y del que sale la URL.
 *
 * El proveedor manda "Z. Zidane" en el campo corto y "Zinedine Zidane" en el largo, pero también
 * manda "José Mourinho" en el corto y "José Mário dos Santos Mourinho Félix" en el largo. El corto
 * gana siempre que no venga abreviado: es el nombre por el que a un entrenador se lo conoce.
 */
export function nombreDeEntrenador(nombre: string, completo: string | null | undefined): string {
  return completo && esNombreAbreviado(nombre) ? completo : nombre;
}

function esChoqueDeUnicidad(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === 'P2002'
  );
}

/**
 * Único dueño de crear entrenadores y de asignarles slug.
 *
 * Lo llaman dos caminos con exigencias distintas: cada alineación trae `{id, name, photo}` y con eso
 * alcanza para que el entrenador exista y el partido pueda enlazarlo; la tarea semanal trae además
 * la ficha completa y la carrera. Los dos tienen que llegar a la misma fila, y la identidad la pone
 * el id del proveedor: sin él, los 4.281 nombres sueltos de `match_lineups` no se pueden reconciliar
 * —"F. Navarro" figura con cinco equipos y no hay forma de saber si es una persona o cinco—.
 */
/**
 * El nombre no se degrada, y con los entrenadores el mejor casi nunca viene de su propia ficha.
 *
 * `/coachs` manda "Guardiola" y "E. Maresca"; las alineaciones de esos mismos partidos mandan "Pep
 * Guardiola" y "Enzo Maresca". Así que gana el que no viene abreviado y, en igualdad, el que trae
 * más palabras: un apellido suelto es un nombre a medias, no una forma corta elegida.
 */
export function mejorNombreDeEntrenador(actual: string, entrante: string): string {
  if (entrante === actual) return actual;
  if (esNombreAbreviado(entrante) !== esNombreAbreviado(actual)) {
    return esNombreAbreviado(entrante) ? actual : entrante;
  }
  /*
   * Entre dos nombres enteros solo se mueve el apellido suelto. "Guardiola" pasa a "Pep Guardiola",
   * pero "Pep Guardiola" no pasa a "Josep Guardiola i Sala": el nombre legal no es por el que se lo
   * conoce, y cambiarlo cada vez que llega uno más largo es puro ruido.
   */
  return palabras(actual) === 1 && palabras(entrante) > 1 ? entrante : actual;
}

const palabras = (nombre: string) => nombre.trim().split(/\s+/).length;

/**
 * Si dos escrituras nombran a la misma persona.
 *
 * Es el guardia que separa refinar de confundir: "Pep Guardiola" refina a "Guardiola", pero
 * "Filipe Luís Kasmirski" no puede pisar a "Marcelo Salles" aunque una alineación mal atada los
 * haya puesto en la misma fila.
 *
 * Comparar la última palabra no alcanza: el proveedor escribe "Josep Guardiola i Sala" en el
 * Mundial de Clubes y ahí el apellido queda en el medio. Se pide que el apellido de uno aparezca
 * entre las palabras del otro, que es lo que distingue a "Guardiola" dentro del nombre completo sin
 * hermanar a "Marcelo Salles" con "Marcelo Gallardo", donde lo que se repite es el nombre de pila.
 */
export function mismoApellido(uno: string, otro: string): boolean {
  const a = normalizar(uno);
  const b = normalizar(otro);
  return contieneAlApellido(a, b) || contieneAlApellido(b, a);
}

/** Tres letras: descarta la inicial de "E. Maresca" y partículas como "de", "dos" o "i". */
const LARGO_MINIMO = 3;

function contieneAlApellido(nombre: string[], dentroDe: string[]): boolean {
  const apellido = nombre.at(-1);
  return apellido !== undefined && apellido.length >= LARGO_MINIMO && dentroDe.includes(apellido);
}

const normalizar = (nombre: string) =>
  nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/);

@Injectable()
export class CoachResolverService {
  private readonly logger = new Logger(CoachResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  /**
   * El id de Athena para cada providerRef, creando los que falten.
   *
   * El reintento es el mismo caso que en jugadores: dos partidos en paralelo traen al mismo DT nuevo
   * y el segundo se choca con el slug único. En la segunda pasada ya existe.
   */
  async resolveMany(seeds: CoachSeed[]): Promise<Map<string, string>> {
    try {
      return await this.resolverUnaVez(seeds);
    } catch (error) {
      if (!esChoqueDeUnicidad(error)) throw error;
      this.logger.warn('Otro proceso creó el mismo entrenador; resolviendo de nuevo');
      return this.resolverUnaVez(seeds);
    }
  }

  private async resolverUnaVez(seeds: CoachSeed[]): Promise<Map<string, string>> {
    const unicos = [...new Map(seeds.map((s) => [s.providerRef, s])).values()];
    if (unicos.length === 0) return new Map();

    const conocidos = await this.refs.resolveMany(
      this.provider.name,
      'coach',
      unicos.map((s) => s.providerRef),
    );

    const nuevos = unicos.filter((s) => !conocidos.has(s.providerRef));
    await this.mejorarNombres(
      unicos.flatMap((seed) => {
        const id = conocidos.get(seed.providerRef);
        return id
          ? [
              {
                id,
                nombre: nombreDeEntrenador(seed.name, seed.fullName),
                deLaFicha: seed.deLaFicha === true,
              },
            ]
          : [];
      }),
    );
    if (nuevos.length === 0) return conocidos;

    const slugs = await this.reservarSlugs(nuevos);
    const creados = await this.prisma.$transaction(async (tx) => {
      const filas = await tx.coach.createManyAndReturn({
        data: nuevos.map((seed) => ({
          name: nombreDeEntrenador(seed.name, seed.fullName),
          fullName: seed.fullName ?? null,
          slug: slugs.get(seed.providerRef) as string,
          photoUrl: seed.photoUrl ?? null,
        })),
        select: { id: true },
      });
      await tx.externalReference.createMany({
        data: filas.map((coach, i) => ({
          provider: this.provider.name,
          entityType: 'coach',
          providerRef: nuevos[i]?.providerRef as string,
          entityId: coach.id,
        })),
        skipDuplicates: true,
      });
      return filas;
    });

    for (const [i, coach] of creados.entries()) {
      conocidos.set(nuevos[i]?.providerRef as string, coach.id);
    }
    this.logger.log(`${creados.length} entrenadores creados`);
    return conocidos;
  }

  /**
   * Le mejora el nombre al entrenador que ya está, y la dirección al que nació abreviado.
   *
   * Lo llaman los dos caminos con nombres de distinta procedencia —la ficha semanal y los nombres
   * escritos en las alineaciones— y por eso recibe ids y nombres pelados: la regla de cuál gana es
   * una sola y vive acá.
   *
   * El slug solo se toca cuando empezó siendo una inicial —"e-maresca"—: una dirección es una URL
   * compartida y se cambia por una razón concreta, no porque llegue un nombre más largo. El viejo
   * queda de alias para que el enlace de ayer siga llevando a alguna parte.
   */
  async mejorarNombres(
    candidatos: Array<{ id: string; nombre: string; deLaFicha?: boolean }>,
  ): Promise<number> {
    if (candidatos.length === 0) return 0;
    const guardados = await this.prisma.coach.findMany({
      where: { id: { in: [...new Set(candidatos.map((c) => c.id))] } },
      select: { id: true, name: true, slug: true },
    });
    const porId = new Map(guardados.map((c) => [c.id, c]));

    /*
     * El mismo entrenador llega con varios nombres escritos y se decide una sola vez. Se prueban de
     * más corto a más largo porque de "Guardiola" se sube al primero que tenga nombre de pila: si
     * entrara antes "Josep Guardiola i Sala" la ficha quedaría con el nombre del registro civil en
     * lugar de con el que usa todo el mundo.
     */
    const mejores = new Map<string, string>();
    for (const candidato of [...candidatos].sort(
      (uno, otro) => uno.nombre.trim().split(/\s+/).length - otro.nombre.trim().split(/\s+/).length,
    )) {
      const actual = porId.get(candidato.id);
      if (!actual) continue;
      const previo = mejores.get(candidato.id) ?? actual.name;
      mejores.set(
        candidato.id,
        mismoApellido(previo, candidato.nombre)
          ? mejorNombreDeEntrenador(previo, candidato.nombre)
          : /* La ficha corrige una identidad equivocada; una alineación suelta no. */
            candidato.deLaFicha === true
            ? candidato.nombre
            : previo,
      );
    }

    const cambios = [...mejores]
      .flatMap(([id, mejor]) => {
        const actual = porId.get(id);
        return actual && actual.name !== mejor ? [{ actual, mejor, slug: slugify(mejor) }] : [];
      })
      .filter((cambio) => cambio.actual.name !== cambio.mejor);
    if (cambios.length === 0) return 0;

    /*
     * Qué slug está libre se pregunta contra la tabla entera y no contra este lote: "marco-silva"
     * puede estar tomado por un entrenador que ni siquiera dirigió hoy. El que choca se queda con su
     * dirección vieja y solo cambia de nombre, porque un slug con sufijo es peor que el corto.
     */
    const ocupados = new Set(
      (
        await this.prisma.coach.findMany({
          where: { slug: { in: cambios.map((c) => c.slug) } },
          select: { slug: true },
        })
      ).map((c) => c.slug),
    );

    let cambiados = 0;
    for (const { actual, mejor, slug } of cambios) {
      const renombrar =
        esSlugAbreviado(actual.slug) && !esNombreAbreviado(mejor) && slug !== '' && !ocupados.has(slug);
      if (renombrar) ocupados.add(slug);

      await this.prisma.$transaction([
        ...(renombrar
          ? [
              this.prisma.slugAlias.upsert({
                where: { entityType_slug: { entityType: 'coach', slug: actual.slug } },
                update: { entityId: actual.id },
                create: { entityType: 'coach', slug: actual.slug, entityId: actual.id },
              }),
            ]
          : []),
        this.prisma.coach.update({
          where: { id: actual.id },
          data: { name: mejor, ...(renombrar ? { slug } : {}) },
        }),
      ]);
      cambiados++;
    }
    return cambiados;
  }

  private async reservarSlugs(seeds: CoachSeed[]): Promise<Map<string, string>> {
    const bases = seeds.map((s) => slugify(nombreDeEntrenador(s.name, s.fullName)));
    const tomados = new Set(
      (
        await this.prisma.coach.findMany({
          where: { slug: { in: bases } },
          select: { slug: true },
        })
      ).map((c) => c.slug),
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
