import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';

/**
 * Un casillero de la cancha. **No lleva el nombre a propósito**: el cliente compara ids, que ya
 * conoce porque se los dio el buscador, y así la respuesta no está en las herramientas del
 * navegador. Los nombres llegan por `solucion`, cuando la partida termina o se pide una pista.
 */
export interface CasilleroDelReto {
  playerId: string;
  grid: string;
  puesto: string | null;
}

export interface RetoParaJugar {
  clave: string;
  catalogo: string;
  dificultad: string;
  competencia: string;
  competenciaLogoUrl: string | null;
  temporada: string;
  fase: string | null;
  objetivoNombre: string;
  objetivoEscudoUrl: string | null;
  objetivoSlug: string | null;
  rivalNombre: string;
  rivalEscudoUrl: string | null;
  deLocal: boolean;
  golesObjetivo: number;
  golesRival: number;
  nota: string | null;
  formacion: string;
  casilleros: CasilleroDelReto[];
}

export interface TitularRevelado {
  playerId: string;
  nombre: string;
  slug: string;
  fotoUrl: string | null;
  grid: string;
}

export interface FutbolistaBuscado {
  id: string;
  nombre: string;
  fotoUrl: string | null;
}

/* Menos de tres letras no tiene trigramas: ahí solo sirve el prefijo. Igual que en la búsqueda del sitio. */
const LARGO_MINIMO_DIFUSO = 3;
const TOPE_DE_RESULTADOS = 8;

@Injectable()
export class RetosDelOnceService {
  constructor(private readonly prisma: PrismaService) {}

  async cuantos(catalogo: string, dificultad: string): Promise<number> {
    return this.prisma.retoDelOnce.count({ where: { catalogo, dificultad } });
  }

  /**
   * Un reto al azar dentro del tipo y la dificultad, fuera de los que ya salieron.
   *
   * Si excluir no deja ninguno, el ciclo vuelve a empezar en vez de devolver vacío: con siete
   * retos por dificultad en el catálogo peruano, agotarlos es cuestión de una tarde.
   */
  async sortear(
    catalogo: string,
    dificultad: string,
    excluir: string[],
  ): Promise<RetoParaJugar | null> {
    const elegida = await this.claveAlAzar(catalogo, dificultad, excluir);
    return elegida === null ? null : this.porClave(elegida);
  }

  private async claveAlAzar(
    catalogo: string,
    dificultad: string,
    excluir: string[],
  ): Promise<string | null> {
    const sortear = async (fuera: string[]): Promise<string | null> => {
      const filas = await this.prisma.$queryRaw<Array<{ clave: string }>>`
        SELECT clave FROM retos_del_once
        WHERE catalogo = ${catalogo} AND dificultad = ${dificultad}
          AND clave <> ALL(${fuera}::text[])
        ORDER BY random() LIMIT 1`;
      return filas[0]?.clave ?? null;
    };

    return (await sortear(excluir)) ?? (excluir.length > 0 ? sortear([]) : null);
  }

  async porClave(clave: string): Promise<RetoParaJugar | null> {
    const reto = await this.prisma.retoDelOnce.findUnique({
      where: { clave },
      include: {
        objetivo: { select: { slug: true } },
        titulares: { select: { playerId: true, grid: true, puesto: true } },
      },
    });
    if (!reto || reto.titulares.length === 0) return null;

    return {
      clave: reto.clave,
      catalogo: reto.catalogo,
      dificultad: reto.dificultad,
      competencia: reto.competencia,
      competenciaLogoUrl: reto.competenciaLogoUrl,
      temporada: reto.temporada,
      fase: reto.fase,
      objetivoNombre: reto.objetivoNombre,
      objetivoEscudoUrl: reto.objetivoEscudoUrl,
      objetivoSlug: reto.objetivo?.slug ?? null,
      rivalNombre: reto.rivalNombre,
      rivalEscudoUrl: reto.rivalEscudoUrl,
      deLocal: reto.deLocal,
      golesObjetivo: reto.golesObjetivo,
      golesRival: reto.golesRival,
      nota: reto.nota,
      formacion: reto.formacion,
      casilleros: reto.titulares.map((t) => ({
        playerId: t.playerId,
        grid: t.grid,
        puesto: t.puesto,
      })),
    };
  }

  /** El once con nombre y cara. Se pide al terminar la partida o al pedir la primera pista. */
  async solucion(clave: string): Promise<TitularRevelado[] | null> {
    const reto = await this.prisma.retoDelOnce.findUnique({
      where: { clave },
      select: {
        titulares: {
          select: {
            playerId: true,
            grid: true,
            player: { select: { name: true, slug: true, photoUrl: true } },
          },
        },
      },
    });
    if (!reto) return null;

    return reto.titulares.map((t) => ({
      playerId: t.playerId,
      nombre: t.player.name,
      slug: t.player.slug,
      fotoUrl: t.player.photoUrl,
      grid: t.grid,
    }));
  }

  /**
   * El buscador de la partida: cara y nombre, nada más.
   *
   * Ni posición, ni club, ni nacionalidad — cualquiera de las tres sería una pista de regalo, y por
   * eso no se reusa `/search`, que devuelve el país como subtítulo y además consulta equipos y
   * competencias que acá sobran.
   *
   * Mira `name` y `full_name` porque el proveedor guarda "L. Messi" en uno y el nombre completo en
   * el otro, y el hincha escribe cualquiera de los dos. Los dos tienen sus índices sin acentos.
   */
  async buscar(consulta: string, tope = TOPE_DE_RESULTADOS): Promise<FutbolistaBuscado[]> {
    const limpia = consulta.trim();
    if (limpia.length === 0) return [];

    const soloPrefijo = limpia.length < LARGO_MINIMO_DIFUSO;
    const filas = await this.prisma.$queryRawUnsafe<
      Array<{ id: string; nombre: string; fotoUrl: string | null }>
    >(
      `
      WITH c AS (SELECT immutable_unaccent(lower($1::text)) AS q)
      SELECT p.id::text, p.name AS nombre, p.photo_url AS "fotoUrl"
      FROM players p, c
      WHERE ${soloPrefijo ? PREFIJO : DIFUSO}
      ORDER BY ${PUNTAJE} DESC, p.name ASC
      LIMIT $2`,
      limpia,
      Math.min(tope, 15),
    );
    return filas;
  }
}

const NOMBRE = 'immutable_unaccent(lower(p.name))';
const COMPLETO = "immutable_unaccent(lower(coalesce(p.full_name, '')))";

const PREFIJO = `${NOMBRE} LIKE c.q || '%' OR ${COMPLETO} LIKE c.q || '%'`;
const DIFUSO = `${PREFIJO} OR ${NOMBRE} % c.q OR ${NOMBRE} LIKE '%' || c.q || '%' OR ${COMPLETO} LIKE '%' || c.q || '%'`;

/** La última palabra del nombre, que es como se llama a un futbolista: "Lionel Messi" → "messi". */
const APELLIDO = `immutable_unaccent(lower(regexp_replace(p.name, '^.*\\s', '')))`;

/*
 * El apellido manda, y por eso este puntaje no es el de la búsqueda del sitio.
 *
 * Con el orden de allá, escribir "messi" devolvía **Messias** primero: le gana el premio por
 * empezar igual, mientras que "Lionel Messi" empieza por "lionel". A un futbolista se lo busca por
 * el apellido, así que acertarle al apellido vale más que acertarle al principio de la ficha.
 *
 * Se calcula sobre lo que el WHERE ya filtró con sus índices, que son un puñado de filas.
 */
const PUNTAJE = `
  greatest(similarity(${NOMBRE}, c.q), similarity(${COMPLETO}, c.q))
  + CASE WHEN ${APELLIDO} = c.q THEN 1.2
         WHEN ${APELLIDO} LIKE c.q || '%' THEN 0.7
         WHEN ${NOMBRE} LIKE c.q || '%' THEN 0.6
         WHEN ${COMPLETO} LIKE c.q || '%' THEN 0.45
         WHEN ${NOMBRE} LIKE '% ' || c.q || '%' THEN 0.3
         WHEN ${COMPLETO} LIKE '% ' || c.q || '%' THEN 0.2
         ELSE 0 END`;
