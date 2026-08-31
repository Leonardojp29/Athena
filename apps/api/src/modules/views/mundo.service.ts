import { Injectable } from '@nestjs/common';
import { paisEnEspanol } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';

/**
 * El mundo del juego: las ligas jugables con sus clubes reales y la fuerza de cada uno.
 *
 * Es la pieza que Athena no tenía: hay catálogo de competencias, pero no de equipos. El juego
 * necesita, en una sola respuesta, qué ligas se pueden elegir y qué clubes las forman con escudo,
 * colores y una idea de cuán grandes son.
 *
 * **La fuerza no se inventa**: sale de la posición promedio de cada club en sus últimas temporadas
 * reales, normalizada contra el tamaño de su liga, y corregida por el peso de la liga —salir décimo
 * en Inglaterra no es salir décimo en Perú—. Un club que siempre pelea arriba queda cerca de 90; uno
 * que pelea el descenso, cerca de 40. Es lo que hace que en el juego ganar la liga con un equipo
 * chico se sienta una hazaña y con un grande se sienta una obligación.
 */

/**
 * El peso futbolístico de cada liga jugable, 0-100. Es la única tabla a mano del archivo, y tiene que
 * serlo: no hay ningún dato en la base que diga que la Premier es más fuerte que la Liga 1, y
 * fingir que se deduce de los partidos sería peor que declararlo. Se revisa a mano cuando cambie el
 * mapa del fútbol.
 */
const PESO_DE_LIGA: Record<string, number> = {
  'premier-league': 100,
  'la-liga': 96,
  'serie-a': 92,
  bundesliga: 92,
  'ligue-1': 86,
  'primeira-liga': 80,
  eredivisie: 78,
  'serie-a-brazil': 80,
  'liga-profesional-argentina': 78,
  'liga-mx': 72,
  'major-league-soccer': 66,
  'pro-league': 64,
  'primera-a': 62,
  'primera-division-uruguay': 60,
  'j1-league': 62,
  'primera-division-chile': 58,
  'liga-pro': 56,
  'primera-division': 54,
  'canadian-premier-league': 46,
  'premier-league-egypt': 52,
};

const PESO_POR_OMISION = 55;

/** Cuántas temporadas atrás se mira para promediar la posición. Tres alcanza y sobra. */
const TEMPORADAS = 3;

export interface ClubDelMundo {
  slug: string;
  nombre: string;
  corto: string;
  escudo: string | null;
  primario: string | null;
  secundario: string | null;
  /** La ciudad del estadio, normalizada: sirve para deducir los clásicos de barrio. */
  ciudad: string | null;
  fuerza: number;
  /**
   * Qué tan conocido es el club, de 0 a 100. Es distinto de la fuerza: la fuerza es relativa a su
   * liga —el mejor de Canadá tiene la misma que un mediano español— y el renombre es absoluto. Sin
   * él, un juego de carrera te hace debutar en Juan Pablo II College y la fantasía se rompe en el
   * primer minuto.
   */
  renombre: number;
  ligaSlug: string;
  ligaNombre: string;
  pais: string;
  paisCodigo: string | null;
  continente: string;
}

export interface LigaDelMundo {
  slug: string;
  nombre: string;
  pais: string;
  paisCodigo: string | null;
  bandera: string | null;
  /** El logo de la competencia: la liga se reconoce por su marca antes que por su nombre. */
  escudo: string | null;
  continente: string;
  peso: number;
  clubes: ClubDelMundo[];
}

export interface CopaNacionalDelMundo {
  slug: string;
  nombre: string;
  pais: string;
  paisCodigo: string | null;
  escudo: string | null;
}

export interface CopaDelMundo {
  slug: string;
  nombre: string;
  continente: string;
  escudo: string | null;
  plazas: number;
  jerarquia: number;
}

/** Un torneo de selecciones, con su escudo real. Es lo que se gana con tu país. */
export interface TorneoDeSeleccionDelMundo {
  slug: string;
  nombre: string;
  continente: string;
  escudo: string | null;
}

export interface Mundo {
  ligas: LigaDelMundo[];
  copas: CopaDelMundo[];
  copasNacionales: CopaNacionalDelMundo[];
  torneos: TorneoDeSeleccionDelMundo[];
  generadoEn: string;
}

@Injectable()
export class MundoService {
  constructor(private readonly prisma: PrismaService) {}

  async mundo(): Promise<Mundo> {
    const [ligas, copas, copasNacionales, torneos] = await Promise.all([
      this.ligasJugables(),
      this.copasContinentales(),
      this.copasNacionales(),
      this.torneosDeSeleccion(),
    ]);
    return {
      ligas,
      copas,
      copasNacionales,
      torneos,
      generadoEn: new Date().toISOString().slice(0, 10),
    };
  }

  /**
   * Cuántas veces cada club jugó una copa continental en las últimas temporadas.
   *
   * Es la señal más honesta de "club grande" que esta base puede dar: la Libertadores y la Champions
   * las juegan los que pelean arriba, año tras año. Una sola consulta para todos los clubes, que
   * después se cruza en memoria.
   */
  private async participacionesContinentales(): Promise<Map<string, number>> {
    const filas = await this.prisma.$queryRaw<Array<{ slug: string; veces: number }>>`
      WITH copas AS (
        SELECT s.id
        FROM seasons s
        JOIN competitions c ON c.id = s.competition_id
        WHERE c.scope = 'clubs' AND c.format = 'cup' AND c.country_code IS NULL
          AND s.year >= date_part('year', now()) - 4
      ),
      participantes AS (
        SELECT DISTINCT m.season_id, m.home_team_id AS team_id FROM matches m WHERE m.season_id IN (SELECT id FROM copas)
        UNION
        SELECT DISTINCT m.season_id, m.away_team_id AS team_id FROM matches m WHERE m.season_id IN (SELECT id FROM copas)
      )
      SELECT t.slug, count(DISTINCT p.season_id)::int AS veces
      FROM participantes p
      JOIN teams t ON t.id = p.team_id
      GROUP BY t.slug`;
    return new Map(filas.map((f) => [f.slug, f.veces]));
  }

  private async ligasJugables(): Promise<LigaDelMundo[]> {
    const competencias = await this.prisma.competition.findMany({
      where: { isActive: true, scope: 'clubs', format: 'league' },
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        countryCode: true,
        flagUrl: true,
        logoUrl: true,
        continent: true,
      },
      orderBy: { name: 'asc' },
    });

    const continentales = await this.participacionesContinentales();
    const ligas: LigaDelMundo[] = [];
    for (const competencia of competencias) {
      const clubes = await this.clubesDe(competencia.id);
      /* Una liga sin tabla reciente no es jugable: no hay de dónde sacar plantel ni fuerza. */
      if (clubes.length < 6) continue;

      const peso = PESO_DE_LIGA[competencia.slug] ?? PESO_POR_OMISION;
      const nombre = competencia.name;
      const pais = paisEnEspanol(competencia.country) ?? competencia.country ?? 'Internacional';

      ligas.push({
        slug: competencia.slug,
        nombre,
        pais,
        paisCodigo: competencia.countryCode,
        bandera: competencia.flagUrl,
        escudo: competencia.logoUrl,
        continente: competencia.continent ?? 'mundial',
        peso,
        clubes: clubes.map((club) => ({
          slug: club.slug,
          nombre: club.nombre,
          /* El corto es para la carta, donde no cabe "Universitario de Deportes". */
          corto: club.corto ?? club.nombre.slice(0, 3).toUpperCase(),
          escudo: club.escudo,
          primario: club.primario,
          secundario: club.secundario,
          ciudad: ciudadDe(club.ciudad),
          ligaSlug: competencia.slug,
          ligaNombre: nombre,
          pais,
          paisCodigo: competencia.countryCode,
          continente: competencia.continent ?? 'mundial',
          fuerza: this.fuerzaDe(club.posicionMedia, club.equipos, peso),
          renombre: this.renombreDe(
            club.posicionMedia,
            club.equipos,
            peso,
            continentales.get(club.slug) ?? 0,
          ),
        })),
      });
    }

    /* Las más fuertes primero: es el orden en que alguien elige dónde quiere jugar. */
    return ligas.sort((a, b) => b.peso - a.peso || a.nombre.localeCompare(b.nombre, 'es'));
  }

  /**
   * Los clubes de una liga con su posición promedio. Se resuelve en SQL porque son veinte ligas por
   * veinte clubes por tres temporadas: en Prisma serían sesenta viajes y acá es uno por liga.
   */
  private async clubesDe(competitionId: string) {
    return this.prisma.$queryRaw<
      Array<{
        slug: string;
        nombre: string;
        corto: string | null;
        escudo: string | null;
        primario: string | null;
        secundario: string | null;
        ciudad: string | null;
        posicionMedia: number;
        equipos: number;
      }>
    >`
      WITH temporadas AS (
        SELECT id FROM seasons
        WHERE competition_id = ${competitionId}::uuid
        ORDER BY year DESC
        LIMIT ${TEMPORADAS}
      ),
      tamano AS (
        SELECT s.season_id, count(DISTINCT s.team_id)::int AS equipos
        FROM standings s
        WHERE s.season_id IN (SELECT id FROM temporadas)
        GROUP BY s.season_id
      )
      SELECT t.slug,
             t.name AS nombre,
             t.short_name AS corto,
             t.logo_url AS escudo,
             t.primary_color AS primario,
             t.secondary_color AS secundario,
             /* La ciudad del estadio: es lo único de la base que delata un clásico de barrio. */
             v.city AS ciudad,
             avg(s.position)::float AS "posicionMedia",
             max(z.equipos)::int AS equipos
      FROM standings s
      JOIN teams t ON t.id = s.team_id
      JOIN tamano z ON z.season_id = s.season_id
      LEFT JOIN venues v ON v.id = t.venue_id
      WHERE s.season_id IN (SELECT id FROM temporadas)
        AND t.is_national_team = false
      GROUP BY t.slug, t.name, t.short_name, t.logo_url, t.primary_color, t.secondary_color, v.city
      /*
       * Al menos dos de las tres temporadas. Con una sola entraban los ascendidos y descendidos —los
       * clubes que nadie ubica— y además distorsionaban la fuerza: un equipo que apareció una vez y
       * salió primero quedaba con la media del campeón (así aparecía "Hull City 90" en la Premier).
       */
      HAVING count(DISTINCT s.season_id) >= 2
      ORDER BY avg(s.position) ASC
      LIMIT 30`;
  }

  /**
   * De la posición a la fuerza. Un club que promedia el primer puesto en una liga de veinte queda en
   * lo más alto de su liga, y el techo de cada liga lo pone su peso: el campeón de una liga de peso
   * 55 no puede valer lo mismo que el de una de 100, porque en el juego van a competir entre ellos.
   */
  private fuerzaDe(posicionMedia: number, equipos: number, pesoDeLiga: number): number {
    const total = Math.max(8, equipos || 20);
    /* 1 → 1, último → 0. */
    const relativa = 1 - (posicionMedia - 1) / (total - 1);
    /* La franja de la liga: de su piso a su techo. Una liga de 100 va de 62 a 92; una de 50, de 38 a 62. */
    const techo = 42 + pesoDeLiga * 0.5;
    const piso = 30 + pesoDeLiga * 0.32;
    const fuerza = piso + (techo - piso) * Math.max(0, Math.min(1, relativa));
    return Math.round(Math.max(30, Math.min(95, fuerza)));
  }

  /**
   * Qué tan conocido es un club, de 0 a 100.
   *
   * Tres señales, en orden de peso: **la liga** donde juega (la Premier pesa 100, la peruana 54),
   * **dónde termina** dentro de ella, y **cuántas veces jugó una copa continental**, que es lo que
   * separa a un grande de un equipo que aguanta la categoría. Un club de una liga chica que va todos
   * los años a la Libertadores termina más conocido que un mediano europeo, y eso es correcto: en
   * Sudamérica lo conoce todo el mundo.
   */
  private renombreDe(
    posicionMedia: number,
    equipos: number,
    pesoDeLiga: number,
    continentales: number,
  ): number {
    const total = Math.max(8, equipos || 20);
    const relativa = 1 - (posicionMedia - 1) / (total - 1);
    const porLiga = pesoDeLiga * 0.55;
    const porPosicion = relativa * 25;
    /* Cuatro participaciones seguidas ya es un grande de su país: se satura ahí. */
    const porCopas = Math.min(continentales, 4) * 6;
    return Math.round(Math.max(0, Math.min(100, porLiga + porPosicion + porCopas)));
  }

  /** Las copas continentales de clubes, con cuántos clasifican por liga. */
  private async copasContinentales(): Promise<CopaDelMundo[]> {
    const copas = await this.prisma.competition.findMany({
      where: { isActive: true, scope: 'clubs', format: 'cup', countryCode: null },
      select: { slug: true, name: true, continent: true, logoUrl: true },
    });

    return copas
      .map((copa) => ({
        slug: copa.slug,
        nombre: copa.name,
        continente: copa.continent ?? 'mundial',
        /* El logo real: es la diferencia entre "ganaste un título" y ver la Champions. */
        escudo: copa.logoUrl,
        plazas: jerarquiaDeCopa(copa.name) === 0 ? 4 : 6,
        jerarquia: jerarquiaDeCopa(copa.name),
      }))
      /* Solo las dos primeras de cada continente: el juego no necesita la tercera división continental. */
      .filter((copa) => copa.jerarquia <= 1)
      .sort((a, b) => a.jerarquia - b.jerarquia);
  }

/**
 * La copa de cada país, con su nombre de verdad.
 *
 * El motor inventaba "Copa de Perú" porque no tenía de dónde sacar el nombre, y a un string
 * inventado no se le puede poner un escudo. Con esto la vitrina dice *Copa del Rey* o *Copa do
 * Brasil* y muestra el logo que el proveedor ya tiene para las 77 competencias.
 */
  private async copasNacionales(): Promise<CopaNacionalDelMundo[]> {
    const copas = await this.prisma.competition.findMany({
      where: { isActive: true, scope: 'clubs', format: 'cup', countryCode: { not: null } },
      select: { slug: true, name: true, country: true, countryCode: true, logoUrl: true },
    });

    /*
     * Una por país. Cuando hay varias manda la que la gente llamaría "la copa": muchos países tienen
     * además una supercopa o un campeón de campeones, y ganar el Campeón de Campeones no es lo que
     * alguien imagina cuando lee "copa de México".
     */
    const rango = (nombre: string) => {
      const n = nombre.toLowerCase();
      if (n.includes('super') || n.includes('campeón de campeones') || n.includes('campeon de campeones')) return 2;
      if (n.startsWith('copa') || n.includes(' cup') || n.startsWith('cup')) return 0;
      return 1;
    };
    const porPais = new Map<string, CopaNacionalDelMundo>();
    for (const copa of [...copas].sort(
      (a, b) => rango(a.name) - rango(b.name) || a.name.localeCompare(b.name, 'es'),
    )) {
      const codigo = copa.countryCode;
      if (!codigo || porPais.has(codigo)) continue;
      porPais.set(codigo, {
        slug: copa.slug,
        nombre: copa.name,
        pais: paisEnEspanol(copa.country) ?? copa.country ?? '',
        paisCodigo: codigo,
        escudo: copa.logoUrl,
      });
    }
    return [...porPais.values()];
  }

  /** Los torneos de selecciones: el Mundial y las continentales, con su escudo. */
  private async torneosDeSeleccion(): Promise<TorneoDeSeleccionDelMundo[]> {
    const torneos = await this.prisma.competition.findMany({
      where: { isActive: true, scope: 'national' },
      select: { slug: true, name: true, continent: true, logoUrl: true },
    });
    return torneos.map((t) => ({
      slug: t.slug,
      nombre: t.name,
      continente: t.continent ?? 'mundial',
      escudo: t.logoUrl,
    }));
  }
}

/**
 * La ciudad del estadio, limpia.
 *
 * El proveedor manda `Liverpool` para el Liverpool y `Liverpool, Merseyside` para el Everton: sin
 * quedarse con lo de antes de la coma, el derbi más famoso de Inglaterra no se detectaría. Los
 * alias de Buenos Aires los resuelve el motor, que es donde se comparan.
 */
function ciudadDe(ciudad: string | null): string | null {
  const base = ciudad?.split(',')[0]?.trim();
  return base && base.length > 0 ? base : null;
}

/** La Champions y la Libertadores son 0; la Europa League y la Sudamericana, 1; el resto, más. */
function jerarquiaDeCopa(nombre: string): number {
  const n = nombre.toLowerCase();
  if (n.includes('champions') || n.includes('libertadores')) return 0;
  if (n.includes('europa league') || n.includes('sudamericana')) return 1;
  if (n.includes('conference')) return 2;
  return 3;
}
