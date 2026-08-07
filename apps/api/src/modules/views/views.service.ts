import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { gruposVigentes } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import {
  CONTINENT_LABEL,
  CONTINENT_ORDER,
  competitionRank,
  continentalRank,
  countryRank,
  type Continent,
} from './regions.js';

const teamSummary = {
  select: { id: true, name: true, shortName: true, slug: true, logoUrl: true },
};

/*
 * Una consulta, no una por relación. Prisma resuelve las relaciones con consultas aparte por
 * omisión y desde fuera de la región de Supabase cada ida y vuelta cuesta cerca de 0,8 s: la vista
 * de partido tardaba 2,4 s y con el join tarda 0,8 s. Va explícito en cada consulta de lectura y
 * no globalmente para no tocar el camino de escritura de la sincronización.
 */
const JOIN = 'join' as const;

/* Lo que hace falta para una tabla de goleadores: quién, en qué equipo y cuánto. */
const goleador = {
  goals: true,
  assists: true,
  appearances: true,
  minutesPlayed: true,
  player: { select: { id: true, name: true, slug: true, photoUrl: true } },
  team: { select: { id: true, name: true, shortName: true, slug: true, logoUrl: true } },
};

/* Un nombre sin slug no lleva a ninguna parte: el timeline traía solo `name`. */
const playerLink = {
  select: { id: true, name: true, slug: true, photoUrl: true },
};

/*
 * Lo que la ficha del jugador muestra dentro de un partido. Viaja completo con la página
 * (~6 KB para veintidós jugadores) para que abrir el modal no cueste una llamada.
 */
const matchPlayerStats = {
  teamId: true,
  shirtNumber: true,
  position: true,
  isStarter: true,
  minutesPlayed: true,
  rating: true,
  captain: true,
  goals: true,
  goalsConceded: true,
  assists: true,
  saves: true,
  shotsTotal: true,
  shotsOnTarget: true,
  passesTotal: true,
  passesKey: true,
  passesAccurate: true,
  tacklesTotal: true,
  interceptions: true,
  duelsTotal: true,
  duelsWon: true,
  dribblesTotal: true,
  dribblesSuccess: true,
  foulsCommitted: true,
  foulsDrawn: true,
  yellowCards: true,
  redCards: true,
  penaltyScored: true,
  penaltyMissed: true,
  penaltySaved: true,
} as const;

const matchCard = {
  id: true,
  kickoffUtc: true,
  status: true,
  statusDetail: true,
  elapsedMinutes: true,
  round: true,
  homeScore: true,
  awayScore: true,
  homeTeam: teamSummary,
  awayTeam: teamSummary,
  season: {
    select: {
      year: true,
      competition: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          country: true,
          countryCode: true,
          flagUrl: true,
          continent: true,
          format: true,
        },
      },
    },
  },
} as const;

/* Perú no tiene horario de verano: el desplazamiento fijo es correcto para siempre. */
const LIMA_OFFSET = '-05:00';
const DAY_MS = 86_400_000;

@Injectable()
export class ViewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * El catálogo entero, ya ordenado continente → país → torneos.
   *
   * Se arma en el API y no en la web porque el orden es una decisión de producto —Perú primero,
   * la liga antes que sus copas— y así el header, el índice y el buscador leen exactamente lo
   * mismo. Antes la web recibía una lista plana y agrupaba con un mapa de países propio.
   */
  async competitions() {
    const rows = await this.prisma.competition.findMany({
      relationLoadStrategy: JOIN,
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        country: true,
        countryCode: true,
        flagUrl: true,
        continent: true,
        format: true,
        logoUrl: true,
      },
    });

    const porContinente = new Map<Continent, Map<string, typeof rows>>();
    for (const row of rows) {
      const continente = (row.continent ?? 'mundial') as Continent;
      /* Los torneos internacionales no tienen país: se agrupan bajo una clave vacía. */
      const clave = row.countryCode ?? '';
      const paises = porContinente.get(continente) ?? new Map<string, typeof rows>();
      paises.set(clave, [...(paises.get(clave) ?? []), row]);
      porContinente.set(continente, paises);
    }

    const porNombre = (a: (typeof rows)[number], b: (typeof rows)[number]) =>
      competitionRank(a.format, a.name) - competitionRank(b.format, b.name) ||
      a.name.localeCompare(b.name, 'es');

    return CONTINENT_ORDER.filter((c) => porContinente.has(c)).map((continent) => {
      const paises = porContinente.get(continent) as Map<string, typeof rows>;
      return {
        continent,
        label: CONTINENT_LABEL[continent],
        /*
         * Las copas de la confederación van sueltas y arriba de los países: la Libertadores es
         * fútbol sudamericano, no "internacional", y quien busca fútbol sudamericano la busca ahí.
         */
        competitions: [...(paises.get('') ?? [])].sort(
          (a, b) =>
            continentalRank(a.name) - continentalRank(b.name) || a.name.localeCompare(b.name, 'es'),
        ),
        countries: [...paises.entries()]
          .filter(([code]) => code !== '')
          .map(([code, competitions]) => ({
            code,
            name: competitions[0]?.country ?? null,
            flagUrl: competitions[0]?.flagUrl ?? null,
            competitions: [...competitions].sort(porNombre),
          }))
          .sort((a, b) => countryRank(a.code) - countryRank(b.code)),
      };
    });
  }

  async home() {
    const now = new Date();
    const dayStart = new Date(now.getTime() - 6 * 3600_000);
    const dayEnd = new Date(now.getTime() + 24 * 3600_000);

    const matches = await this.prisma.match.findMany({
      relationLoadStrategy: JOIN,
      where: {
        OR: [
          { status: { in: ['in_play', 'paused'] } },
          { kickoffUtc: { gte: dayStart, lte: dayEnd } },
        ],
      },
      select: matchCard,
      orderBy: { kickoffUtc: 'asc' },
      take: 100,
    });

    return {
      live: matches.filter((m) => m.status === 'in_play' || m.status === 'paused').length,
      sections: groupByCompetition(matches),
      geography: groupByGeography(matches),
    };
  }

  /**
   * Los mejores del día por nota, con su partido.
   *
   * Es el dato que Athena tiene y nadie más muestra para estas ligas: el rendimiento
   * individual ya está en la base, así que "quién jugó mejor hoy" cuesta una consulta y no una
   * llamada al proveedor.
   */
  /**
   * Los líderes de una región: los goleadores de la temporada y lo mejor del último día con
   * partidos jugados.
   *
   * Va por continente porque "lo mejor del mundo" no le sirve a nadie: a quien mira desde Lima, la
   * mejor nota de la MLS no le mueve nada. El continente lo elige quien lee; por omisión, el suyo.
   */
  async topPerformers(date: string, limite = 6, continente = 'sudamerica') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Fecha inválida');

    /*
     * A media mañana ningún partido del día terminó todavía y el podio quedaría vacío, así que
     * se mira también ayer y anteayer. Los tres días y los goleadores van en paralelo: en serie
     * eran cuatro viajes a Supabase sumados, y desde fuera de su región cada uno cuesta cerca de
     * un segundo.
     */
    const dias = [0, -1, -2].map((offset) =>
      new Date(new Date(`${date}T12:00:00${LIMA_OFFSET}`).getTime() + offset * DAY_MS)
        .toISOString()
        .slice(0, 10),
    );
    const [scorers, ...resultados] = await Promise.all([
      this.goleadoresDe(continente),
      ...dias.map((iso) => this.performersOn(iso, limite, continente)),
    ]);

    for (const [i, players] of resultados.entries()) {
      if (players.length > 0) {
        return { continent: continente, scorers, date: dias[i] as string, esDeHoy: i === 0, players };
      }
    }
    return { continent: continente, scorers, date, esDeHoy: true, players: [] };
  }

  private async performersOn(date: string, limite: number, continente?: string) {
    const start = new Date(`${date}T00:00:00${LIMA_OFFSET}`);

    const filas = await this.prisma.matchPlayerStatistics.findMany({
      relationLoadStrategy: JOIN,
      where: {
        rating: { not: null },
        minutesPlayed: { gte: 45 },
        match: {
          status: 'finished',
          kickoffUtc: { gte: start, lt: new Date(start.getTime() + DAY_MS) },
          ...(continente ? { season: { competition: { continent: continente } } } : {}),
        },
      },
      orderBy: [{ rating: 'desc' }, { minutesPlayed: 'desc' }],
      /* Se pide de sobra para poder reordenar por lo que de verdad importa y recortar después. */
      take: Math.max(limite * 6, 40),
      select: {
        rating: true,
        minutesPlayed: true,
        goals: true,
        assists: true,
        penaltyScored: true,
        player: playerLink,
        team: teamSummary,
        match: {
          select: {
            id: true,
            homeScore: true,
            awayScore: true,
            homeTeam: teamSummary,
            awayTeam: teamSummary,
            season: {
              select: {
                competition: {
                  select: { name: true, slug: true, logoUrl: true, country: true, flagUrl: true },
                },
              },
            },
          },
        },
      },
    });

    /*
     * Ordenado por lo que un hincha llama "jugó bien", no por la nota pelada. La nota sola ponía
     * arriba a un defensor con 7.6 que no tocó la pelota, y dejaba afuera al que hizo dos goles.
     * Los goles pesan doble, la asistencia una, y la nota decide los empates.
     */
    return [...filas]
      .sort((a, b) => puntaje(b) - puntaje(a))
      .slice(0, limite);
  }

  /** El índice de partidos: un día calendario de Lima, agrupado por competencia. */
  async matchesOnDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Fecha inválida');
    const start = new Date(`${date}T00:00:00${LIMA_OFFSET}`);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Fecha inválida');

    const matches = await this.prisma.match.findMany({
      relationLoadStrategy: JOIN,
      where: { kickoffUtc: { gte: start, lt: new Date(start.getTime() + DAY_MS) } },
      select: matchCard,
      orderBy: { kickoffUtc: 'asc' },
      take: 300,
    });

    return {
      date,
      total: matches.length,
      live: matches.filter((m) => m.status === 'in_play' || m.status === 'paused').length,
      sections: groupByCompetition(matches),
      geography: groupByGeography(matches),
    };
  }

  /*
   * Todo cuelga del slug y de "la temporada vigente", así que nada tiene que esperar a nada: pedir
   * la competencia, después su temporada y después la tabla eran tres viajes en fila.
   */
  async competition(slug: string) {
    const temporadaVigente = {
      competition: { slug },
      isCurrent: true,
    };

    const [competition, season, standings, recent, upcoming, scorers, assisters, once] =
      await Promise.all([
      this.prisma.competition.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          slug: true,
          country: true,
          countryCode: true,
          flagUrl: true,
          format: true,
          logoUrl: true,
        },
      }),
      this.prisma.season.findFirst({
        where: temporadaVigente,
        orderBy: { year: 'desc' },
        select: { id: true, year: true },
      }),
      this.prisma.standing.findMany({
        relationLoadStrategy: JOIN,
        where: { season: temporadaVigente },
        orderBy: [{ groupLabel: 'asc' }, { position: 'asc' }],
        select: {
          groupLabel: true,
          position: true,
          points: true,
          played: true,
          won: true,
          drawn: true,
          lost: true,
          goalsFor: true,
          goalsAgainst: true,
          form: true,
          team: teamSummary,
        },
      }),
      this.prisma.match.findMany({
        relationLoadStrategy: JOIN,
        where: { season: temporadaVigente, status: 'finished' },
        select: matchCard,
        orderBy: { kickoffUtc: 'desc' },
        take: 10,
      }),
      this.prisma.match.findMany({
        relationLoadStrategy: JOIN,
        where: {
          season: temporadaVigente,
          status: { in: ['scheduled', 'in_play', 'paused'] },
          kickoffUtc: { gte: new Date(Date.now() - 3 * 3600_000) },
        },
        select: matchCard,
        orderBy: { kickoffUtc: 'asc' },
        take: 10,
      }),
      /*
       * Goleadores y asistidores de la temporada. Ya estaban en la base —vienen con la bio en
       * /players— y no se mostraban en ninguna parte, mientras la página de la competencia dejaba
       * media pantalla vacía debajo de la tabla.
       */
      this.prisma.playerSeasonStatistics.findMany({
        relationLoadStrategy: JOIN,
        where: { season: temporadaVigente, goals: { gt: 0 } },
        orderBy: [{ goals: 'desc' }, { assists: 'desc' }, { minutesPlayed: 'asc' }],
        take: 10,
        select: goleador,
      }),
      this.prisma.playerSeasonStatistics.findMany({
        relationLoadStrategy: JOIN,
        where: { season: temporadaVigente, assists: { gt: 0 } },
        orderBy: [{ assists: 'desc' }, { goals: 'desc' }, { minutesPlayed: 'asc' }],
        take: 10,
        select: goleador,
      }),
      this.onceDeLaFecha(slug),
    ]);
    if (!competition) throw new NotFoundException('Competencia no encontrada');
    if (!season) throw new NotFoundException('Sin temporada activa');

    const groups = new Map<string, typeof standings>();
    for (const row of standings) {
      if (!groups.has(row.groupLabel)) groups.set(row.groupLabel, []);
      groups.get(row.groupLabel)?.push(row);
    }

    /*
     * Cuál tabla está en juego lo dice el calendario, no la tabla: la jornada del próximo partido
     * —o del último jugado si la temporada terminó— nombra la fase. Sin esto la Liga 1 abría en el
     * Apertura, cerrado en mayo, mientras se jugaba el Clausura.
     */
    const jornada = upcoming[0]?.round ?? recent[0]?.round ?? null;
    const vigentes = new Set(gruposVigentes(jornada, [...groups.keys()]));

    const standingGroups = [...groups.entries()]
      .map(([label, rows]) => ({ label, rows, current: vigentes.has(label) }))
      .sort((a, b) => Number(b.current) - Number(a.current));

    return {
      competition,
      season: { year: season.year },
      /* La jornada viaja para que la interfaz pueda decir "Clausura · fecha 4" sin recalcularla. */
      round: jornada,
      standingGroups,
      recent,
      upcoming,
      scorers,
      assisters,
      once,
    };
  }

  /**
   * El historial entre los dos equipos de un partido.
   *
   * Va en SQL y con el id del partido como única entrada, así que entra en la misma tanda paralela
   * que el resto de la vista: pedir el partido primero para conocer a los dos equipos costaría un
   * viaje entero a Supabase. El resumen se cuenta sobre toda la historia y la lista sobre los
   * últimos cruces, que son dos preguntas distintas.
   */
  private async historial(matchId: string): Promise<Historial> {
    /*
     * Una sola consulta para los cruces y el resumen. Eran dos y, dentro del lote que Prisma arma
     * con el resto de la vista, la segunda perdía de vista su propio FROM y respondía 42P01 —cada
     * una por separado funcionaba—. Las funciones de ventana se evalúan antes del LIMIT, así que
     * `OVER ()` cuenta toda la historia aunque solo se devuelvan los últimos ocho cruces.
     */
    const filas = await this.prisma.$queryRaw<FilaHistorial[]>`
      WITH actual AS (
        SELECT home_team_id, away_team_id FROM matches WHERE id = ${matchId}::uuid
      ),
      cruces AS (
        SELECT m.id, m.kickoff_utc, m.home_score, m.away_score,
               m.home_team_id, m.away_team_id, a.home_team_id AS local_actual,
               a.away_team_id AS visita_actual, m.season_id
        FROM matches m
        CROSS JOIN actual a
        WHERE m.id <> ${matchId}::uuid AND m.status = 'finished'
          AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
          AND ((m.home_team_id = a.home_team_id AND m.away_team_id = a.away_team_id)
            OR (m.home_team_id = a.away_team_id AND m.away_team_id = a.home_team_id))
      )
      SELECT c.id, c.kickoff_utc, c.home_score, c.away_score,
             hl.name AS home_name, hl.short_name AS home_short, hl.slug AS home_slug,
             hl.logo_url AS home_logo,
             aw.name AS away_name, aw.short_name AS away_short, aw.slug AS away_slug,
             aw.logo_url AS away_logo,
             co.name AS competition_name, co.slug AS competition_slug,
             count(*) OVER ()::int AS jugados,
             sum(CASE WHEN (c.home_team_id = c.local_actual AND c.home_score > c.away_score)
                        OR (c.away_team_id = c.local_actual AND c.away_score > c.home_score)
                      THEN 1 ELSE 0 END) OVER ()::int AS gano_local,
             sum(CASE WHEN c.home_score = c.away_score THEN 1 ELSE 0 END) OVER ()::int AS empates,
             sum(CASE WHEN (c.home_team_id = c.visita_actual AND c.home_score > c.away_score)
                        OR (c.away_team_id = c.visita_actual AND c.away_score > c.home_score)
                      THEN 1 ELSE 0 END) OVER ()::int AS gano_visita,
             sum(CASE WHEN c.home_team_id = c.local_actual THEN c.home_score ELSE c.away_score END)
               OVER ()::int AS goles_local,
             sum(CASE WHEN c.home_team_id = c.visita_actual THEN c.home_score ELSE c.away_score END)
               OVER ()::int AS goles_visita
      FROM cruces c
      JOIN teams hl ON hl.id = c.home_team_id
      JOIN teams aw ON aw.id = c.away_team_id
      JOIN seasons se ON se.id = c.season_id
      JOIN competitions co ON co.id = se.competition_id
      ORDER BY c.kickoff_utc DESC
      LIMIT 8`;

    const primera = filas[0];
    return {
      resumen: primera
        ? {
            jugados: primera.jugados,
            gano_local: primera.gano_local,
            empates: primera.empates,
            gano_visita: primera.gano_visita,
            goles_local: primera.goles_local,
            goles_visita: primera.goles_visita,
          }
        : null,
      ultimos: filas,
    };
  }

  /**
   * Los goleadores de un continente en la temporada en curso.
   *
   * Suma lo que cada futbolista hizo en todas las competencias de esa región —liga, copa nacional
   * y copa continental—, que es como lo cuenta un hincha: "lleva veinte esta temporada". El equipo
   * y el torneo que se muestran son los de mayor peso en su fila, no el primero que devolvió la
   * base.
   */
  private async goleadoresDe(continente: string, limite = 10): Promise<Goleador[]> {
    return this.prisma.$queryRaw<Goleador[]>`
      WITH acumulado AS (
        SELECT s.player_id,
               sum(s.goals)::int       AS goals,
               sum(s.assists)::int     AS assists,
               sum(s.appearances)::int AS appearances,
               (array_agg(t.name       ORDER BY s.appearances DESC NULLS LAST))[1] AS team_name,
               (array_agg(t.short_name ORDER BY s.appearances DESC NULLS LAST))[1] AS team_short,
               (array_agg(t.slug       ORDER BY s.appearances DESC NULLS LAST))[1] AS team_slug,
               (array_agg(t.logo_url   ORDER BY s.appearances DESC NULLS LAST))[1] AS team_logo,
               (array_agg(c.name       ORDER BY s.goals DESC NULLS LAST))[1] AS competition_name,
               (array_agg(c.slug       ORDER BY s.goals DESC NULLS LAST))[1] AS competition_slug,
               (array_agg(c.logo_url   ORDER BY s.goals DESC NULLS LAST))[1] AS competition_logo
        FROM player_season_statistics s
        JOIN seasons se ON se.id = s.season_id
        JOIN competitions c ON c.id = se.competition_id
        JOIN teams t ON t.id = s.team_id
        WHERE se.is_current AND c.is_active AND c.continent = ${continente} AND s.goals > 0
        GROUP BY s.player_id
      )
      SELECT a.goals, a.assists, a.appearances,
             a.team_name, a.team_short, a.team_slug, a.team_logo,
             a.competition_name, a.competition_slug, a.competition_logo,
             p.id AS player_id, p.name AS player_name, p.slug AS player_slug, p.photo_url
      FROM acumulado a
      JOIN players p ON p.id = a.player_id
      ORDER BY a.goals DESC, a.assists DESC, a.appearances ASC
      LIMIT ${limite}`;
  }

  /**
   * El once de la fecha de una competencia: los mejores por puesto en la última jornada que ya
   * tiene notas. Va en SQL porque es un ranking por partición —el mejor arquero, los cuatro
   * mejores defensores— y eso en Prisma serían cinco consultas y un ordenamiento en memoria.
   */
  private async onceDeLaFecha(slug: string): Promise<OnceDeLaFecha | null> {
    const filas = await this.prisma.$queryRaw<FilaOnce[]>`
      WITH jornadas AS (
        SELECT m.round, count(DISTINCT m.id) AS partidos, max(m.kickoff_utc) AS ultima
        FROM matches m
        JOIN seasons se ON se.id = m.season_id
        JOIN competitions c ON c.id = se.competition_id
        WHERE c.slug = ${slug} AND se.is_current AND m.status = 'finished'
          AND EXISTS (SELECT 1 FROM match_player_statistics s WHERE s.match_id = m.id AND s.rating IS NOT NULL)
        GROUP BY m.round
      ),
      -- La fecha en curso arranca con un partido jugado y un once salido de ahí sería el once de
      -- ese partido. Se prefiere la última jornada con tres o más, y si ninguna llega, la última.
      jornada AS (
        SELECT round FROM jornadas ORDER BY (partidos >= 3) DESC, ultima DESC LIMIT 1
      ),
      notas AS (
        SELECT ps.position, ps.rating, ps.goals, ps.assists, ps.minutes_played, ps.shirt_number,
               ps.saves, ps.shots_total, ps.shots_on_target, ps.passes_total, ps.passes_key,
               ps.passes_accurate, ps.tackles_total, ps.interceptions, ps.duels_total, ps.duels_won,
               ps.dribbles_total, ps.dribbles_success, ps.fouls_committed, ps.fouls_drawn,
               ps.yellow_cards, ps.red_cards, ps.penalty_scored, ps.penalty_missed, ps.penalty_saved,
               p.id AS player_id, p.name AS player_name, p.slug AS player_slug, p.photo_url,
               t.name AS team_name, t.short_name AS team_short, t.slug AS team_slug, t.logo_url AS team_logo,
               m.id AS match_id, j.round,
               row_number() OVER (PARTITION BY ps.position ORDER BY ps.rating DESC, ps.minutes_played DESC) AS puesto
        FROM match_player_statistics ps
        JOIN matches m ON m.id = ps.match_id
        JOIN jornada j ON j.round = m.round
        JOIN seasons se ON se.id = m.season_id
        JOIN competitions c ON c.id = se.competition_id
        JOIN players p ON p.id = ps.player_id
        JOIN teams t ON t.id = ps.team_id
        WHERE c.slug = ${slug} AND se.is_current AND ps.rating IS NOT NULL AND ps.position IS NOT NULL
      )
      -- Columnas explícitas y rating como texto: row_number() devuelve bigint y con SELECT *
      -- viajaba hasta el JSON, que no sabe serializarlo y tiraba la vista entera con un 500.
      SELECT position, rating::text AS rating, goals, assists, minutes_played, shirt_number,
             saves, shots_total, shots_on_target, passes_total, passes_key, passes_accurate,
             tackles_total, interceptions, duels_total, duels_won, dribbles_total, dribbles_success,
             fouls_committed, fouls_drawn, yellow_cards, red_cards,
             penalty_scored, penalty_missed, penalty_saved,
             player_id, player_name, player_slug, photo_url,
             team_name, team_short, team_slug, team_logo, match_id, round
      FROM notas
      WHERE (position = 'G' AND puesto <= 1)
         OR (position = 'D' AND puesto <= 4)
         OR (position = 'M' AND puesto <= 4)
         OR (position = 'F' AND puesto <= 2)
      ORDER BY array_position(ARRAY['G','D','M','F'], position), rating DESC`;

    if (filas.length < 6) return null;
    return { round: filas[0]?.round ?? null, players: filas };
  }

  /*
   * Todo por slug y en paralelo. Pedir el equipo primero para tener su id costaba un viaje entero
   * a Supabase; filtrar por la relación cuesta un join, que del lado de la base no se nota.
   */
  async team(slug: string) {
    const [team, standings, recent, upcoming, squad, scorers] = await Promise.all([
      this.prisma.team.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          shortName: true,
          slug: true,
          country: true,
          founded: true,
          logoUrl: true,
          primaryColor: true,
          secondaryColor: true,
        },
      }),
      this.prisma.standing.findMany({
        relationLoadStrategy: JOIN,
        where: { team: { slug }, season: { isCurrent: true } },
        select: {
          position: true,
          points: true,
          played: true,
          won: true,
          drawn: true,
          lost: true,
          goalsFor: true,
          goalsAgainst: true,
          form: true,
          groupLabel: true,
          season: {
            select: {
              year: true,
              competition: { select: { name: true, slug: true, logoUrl: true } },
            },
          },
        },
      }),
      this.prisma.match.findMany({
        relationLoadStrategy: JOIN,
        where: { status: 'finished', OR: [{ homeTeam: { slug } }, { awayTeam: { slug } }] },
        select: matchCard,
        orderBy: { kickoffUtc: 'desc' },
        take: 10,
      }),
      this.prisma.match.findMany({
        relationLoadStrategy: JOIN,
        where: {
          status: { in: ['scheduled', 'in_play', 'paused'] },
          kickoffUtc: { gte: new Date(Date.now() - 3 * 3600_000) },
          OR: [{ homeTeam: { slug } }, { awayTeam: { slug } }],
        },
        select: matchCard,
        orderBy: { kickoffUtc: 'asc' },
        take: 10,
      }),
      /*
       * El año no se puede fijar: la Liga 1 corre 2026 y la Premier 2025 al mismo tiempo.
       * Se piden todos y se conserva la campaña más reciente que tenga el equipo.
       */
      this.prisma.squadMembership.findMany({
        relationLoadStrategy: JOIN,
        where: { team: { slug } },
        orderBy: [{ year: 'desc' }, { shirtNumber: 'asc' }],
        select: {
          year: true,
          shirtNumber: true,
          position: true,
          player: { select: { id: true, name: true, slug: true, photoUrl: true, position: true } },
        },
      }),
      /*
       * Los goleadores del club en la temporada. La plantilla dice quiénes están; esto dice quiénes
       * juegan, que es la pregunta siguiente.
       */
      this.prisma.playerSeasonStatistics.findMany({
        relationLoadStrategy: JOIN,
        where: { team: { slug }, season: { isCurrent: true } },
        orderBy: [{ goals: 'desc' }, { assists: 'desc' }, { appearances: 'desc' }],
        take: 10,
        select: {
          ...goleador,
          rating: true,
          season: { select: { year: true, competition: { select: { name: true, slug: true } } } },
        },
      }),
    ]);
    if (!team) throw new NotFoundException('Equipo no encontrado');

    /*
     * Un equipo puede tener dos tablas del mismo torneo —el Apertura cerrado y el Clausura en
     * juego— y la que interesa es la de ahora. La fase la dice el calendario del propio equipo:
     * la jornada de su próximo partido en esa competencia, o del último que jugó.
     */
    const jornadaPorTorneo = new Map<string, string | null>();
    for (const match of [...upcoming, ...recent]) {
      const clave = match.season.competition.slug;
      if (!jornadaPorTorneo.has(clave)) jornadaPorTorneo.set(clave, match.round);
    }

    const etiquetasPorTorneo = new Map<string, string[]>();
    for (const fila of standings) {
      const clave = fila.season.competition.slug;
      etiquetasPorTorneo.set(clave, [...(etiquetasPorTorneo.get(clave) ?? []), fila.groupLabel]);
    }

    const vigentes = new Set(
      [...etiquetasPorTorneo.entries()].flatMap(([clave, etiquetas]) =>
        gruposVigentes(jornadaPorTorneo.get(clave) ?? null, etiquetas).map((label) => `${clave}:${label}`),
      ),
    );

    const tablas = standings
      .map((fila) => ({
        ...fila,
        current: vigentes.has(`${fila.season.competition.slug}:${fila.groupLabel}`),
      }))
      .sort((a, b) => Number(b.current) - Number(a.current) || b.played - a.played);

    const squadYear = squad[0]?.year ?? null;
    const currentSquad = squad.filter((row) => row.year === squadYear);

    return {
      team,
      standings: tablas,
      recent,
      upcoming,
      squad: { year: squadYear, lines: groupSquadByLine(currentSquad) },
      scorers,
    };
  }

  /*
   * Las cinco consultas van juntas, incluida la del partido. Encadenar el `findUnique` primero
   * costaba un viaje entero a Supabase —cerca de un segundo desde fuera de su región— para
   * enterarse de algo que las otras cuatro toleran: un id que no existe devuelve listas vacías.
   */
  async match(id: string) {
    const [match, insights, statistics, lineups, playerStatistics, historial] = await Promise.all([
      this.prisma.match.findUnique({
        relationLoadStrategy: JOIN,
        where: { id },
        select: {
          ...matchCard,
          venue: { select: { id: true, name: true, city: true, capacity: true } },
          events: {
            orderBy: [{ minute: 'asc' }, { extraMinute: 'asc' }],
            select: {
              id: true,
              kind: true,
              minute: true,
              extraMinute: true,
              detail: true,
              team: { select: { id: true } },
              player: playerLink,
              relatedPlayer: playerLink,
            },
          },
        },
      }),
      this.prisma.insight.findMany({
        where: {
          subjectType: 'match',
          subjectId: id,
          kind: { in: ['post_match_analysis', 'match_preview'] },
          lang: 'es',
        },
        orderBy: { generatedAt: 'desc' },
        select: {
          kind: true,
          narrative: true,
          evidence: true,
          model: true,
          promptVersion: true,
          generatedAt: true,
        },
      }),
      this.prisma.matchStatistics.findMany({
        where: { matchId: id },
        select: {
          teamId: true,
          possessionPercent: true,
          shotsTotal: true,
          shotsOnGoal: true,
          shotsOffGoal: true,
          corners: true,
          offsides: true,
          fouls: true,
          yellowCards: true,
          redCards: true,
          goalkeeperSaves: true,
          passesTotal: true,
          passesAccurate: true,
          passesPercent: true,
        },
      }),
      this.prisma.matchLineup.findMany({
        where: { matchId: id },
        select: {
          teamId: true,
          formation: true,
          coachName: true,
          startXi: true,
          substitutes: true,
        },
      }),
      this.prisma.matchPlayerStatistics.findMany({
        relationLoadStrategy: JOIN,
        where: { matchId: id },
        orderBy: [{ isStarter: 'desc' }, { minutesPlayed: 'desc' }],
        select: { ...matchPlayerStats, player: playerLink },
      }),
      this.historial(id),
    ]);
    if (!match) throw new NotFoundException('Partido no encontrado');

    const hydrate = (row: (typeof insights)[number]) => ({
      ...(JSON.parse(row.narrative) as Record<string, unknown>),
      model: row.model,
      promptVersion: row.promptVersion,
      generatedAt: row.generatedAt,
      evidence: row.evidence,
    });
    const recap = insights.find((row) => row.kind === 'post_match_analysis');
    const preview = insights.find((row) => row.kind === 'match_preview');

    return {
      ...match,
      insight: recap ? hydrate(recap) : null,
      preview: preview ? hydrate(preview) : null,
      statistics,
      lineups,
      playerStatistics,
      historial,
    };
  }

  async player(slug: string) {
    /*
     * Antes eran cuatro viajes en fila —jugador, relaciones, equipos y el resto— y desde fuera de
     * la región de Supabase cada uno cuesta cerca de un segundo. Ahora todo lo que se puede pedir
     * por slug va junto; los equipos son el único paso que necesita el resultado anterior.
     */
    const [player, teams, events, seasons, recentPerformances, squad] = await Promise.all([
      this.prisma.player.findUnique({
        where: { slug },
        select: {
          id: true,
          name: true,
          fullName: true,
          slug: true,
          position: true,
          nationality: true,
          birthDate: true,
          heightCm: true,
          photoUrl: true,
        },
      }),
      /*
       * En SQL y de una: `entity_relationships` no tiene relación con `players`, así que por
       * Prisma harían falta dos viajes —las aristas y después los equipos— para armar una lista
       * que un join resuelve sin salir de la base.
       */
      this.prisma.$queryRaw<TeamOfPlayer[]>`
        SELECT t.id, t.name, t.slug, t.logo_url AS "logoUrl", t.country
        FROM entity_relationships r
        JOIN teams t ON t.id = r.to_id
        JOIN players p ON p.id = r.from_id
        WHERE r.from_type = 'player' AND r.relation = 'played_for' AND p.slug = ${slug}
        ORDER BY t.name`,
      this.prisma.matchEvent.findMany({
        relationLoadStrategy: JOIN,
        where: { player: { slug } },
        orderBy: { match: { kickoffUtc: 'desc' } },
        take: 20,
        select: {
          kind: true,
          minute: true,
          match: {
            select: {
              id: true,
              kickoffUtc: true,
              homeScore: true,
              awayScore: true,
              homeTeam: { select: { name: true } },
              awayTeam: { select: { name: true } },
              season: { select: { competition: { select: { name: true } } } },
            },
          },
        },
      }),
      this.prisma.playerSeasonStatistics.findMany({
        relationLoadStrategy: JOIN,
        where: { player: { slug } },
        orderBy: [{ season: { year: 'desc' } }],
        select: {
          appearances: true,
          lineups: true,
          minutesPlayed: true,
          rating: true,
          goals: true,
          assists: true,
          shotsTotal: true,
          shotsOnTarget: true,
          passesTotal: true,
          passesKey: true,
          passesAccuracyPercent: true,
          duelsWon: true,
          dribblesSuccess: true,
          yellowCards: true,
          redCards: true,
          penaltyScored: true,
          team: teamSummary,
          season: {
            select: {
              year: true,
              competition: { select: { name: true, slug: true, logoUrl: true } },
            },
          },
        },
      }),
      this.prisma.matchPlayerStatistics.findMany({
        relationLoadStrategy: JOIN,
        where: { player: { slug } },
        orderBy: { match: { kickoffUtc: 'desc' } },
        take: 10,
        select: {
          ...matchPlayerStats,
          match: {
            select: {
              id: true,
              kickoffUtc: true,
              homeScore: true,
              awayScore: true,
              homeTeam: teamSummary,
              awayTeam: teamSummary,
              season: { select: { competition: { select: { name: true, slug: true } } } },
            },
          },
        },
      }),
      this.prisma.squadMembership.findMany({
        relationLoadStrategy: JOIN,
        where: { player: { slug } },
        orderBy: { year: 'desc' },
        take: 4,
        select: { year: true, shirtNumber: true, team: teamSummary },
      }),
    ]);
    if (!player) throw new NotFoundException('Jugador no encontrado');

    /* Los acumulados de todas las temporadas: el hincha quiere "cuántos hizo", no un desglose. */
    const totals = seasons.reduce(
      (acc, row) => ({
        appearances: acc.appearances + (row.appearances ?? 0),
        minutesPlayed: acc.minutesPlayed + (row.minutesPlayed ?? 0),
        goals: acc.goals + (row.goals ?? 0),
        assists: acc.assists + (row.assists ?? 0),
        yellowCards: acc.yellowCards + (row.yellowCards ?? 0),
        redCards: acc.redCards + (row.redCards ?? 0),
      }),
      { appearances: 0, minutesPlayed: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    );

    return {
      player,
      teams,
      events,
      seasons,
      totals: seasons.length > 0 ? totals : null,
      recentPerformances,
      shirtNumber: squad.find((s) => s.shirtNumber !== null)?.shirtNumber ?? null,
      squad,
    };
  }

  async sitemapEntries() {
    const [competitions, teams, players] = await Promise.all([
      this.prisma.competition.findMany({ where: { isActive: true }, select: { slug: true } }),
      this.prisma.team.findMany({ select: { slug: true, updatedAt: true } }),
      this.prisma.player.findMany({ select: { slug: true }, take: 5_000 }),
    ]);
    return { competitions, teams, players };
  }
}

/** Goles x2 + asistencias + la nota como desempate: la fórmula está a la vista a propósito. */
function puntaje(fila: {
  rating: string | { toString(): string } | null;
  goals: number | null;
  assists: number | null;
}): number {
  const nota = fila.rating === null ? 0 : Number(fila.rating.toString());
  return (fila.goals ?? 0) * 2 + (fila.assists ?? 0) + nota / 10;
}

export interface ResumenHistorial {
  jugados: number;
  gano_local: number;
  empates: number;
  gano_visita: number;
  goles_local: number;
  goles_visita: number;
}

export interface FilaHistorial extends CruceHistorial, ResumenHistorial {}

export interface CruceHistorial {
  id: string;
  kickoff_utc: Date;
  home_score: number | null;
  away_score: number | null;
  home_name: string;
  home_short: string | null;
  home_slug: string;
  home_logo: string | null;
  away_name: string;
  away_short: string | null;
  away_slug: string;
  away_logo: string | null;
  competition_name: string;
  competition_slug: string;
}

export interface Historial {
  resumen: ResumenHistorial | null;
  ultimos: CruceHistorial[];
}

export interface Goleador {
  goals: number;
  assists: number;
  appearances: number;
  team_name: string;
  team_short: string | null;
  team_slug: string;
  team_logo: string | null;
  competition_name: string;
  competition_slug: string;
  competition_logo: string | null;
  player_id: string;
  player_name: string;
  player_slug: string;
  photo_url: string | null;
}

export interface FilaOnce {
  position: string;
  rating: string | null;
  goals: number | null;
  assists: number | null;
  minutes_played: number | null;
  shirt_number: number | null;
  saves: number | null;
  shots_total: number | null;
  shots_on_target: number | null;
  passes_total: number | null;
  passes_key: number | null;
  passes_accurate: number | null;
  tackles_total: number | null;
  interceptions: number | null;
  duels_total: number | null;
  duels_won: number | null;
  dribbles_total: number | null;
  dribbles_success: number | null;
  fouls_committed: number | null;
  fouls_drawn: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  penalty_scored: number | null;
  penalty_missed: number | null;
  penalty_saved: number | null;
  player_id: string;
  player_name: string;
  player_slug: string;
  photo_url: string | null;
  team_name: string;
  team_short: string | null;
  team_slug: string;
  team_logo: string | null;
  match_id: string;
  round: string;
}

export interface OnceDeLaFecha {
  round: string | null;
  players: FilaOnce[];
}

export interface TeamOfPlayer {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  country: string | null;
}

type Grouped<T extends { season: { competition: { id: string } } }> = Array<{
  competition: T['season']['competition'];
  matches: T[];
}>;

function groupByCompetition<T extends { season: { competition: { id: string } } }>(
  matches: T[],
): Grouped<T> {
  const byCompetition = new Map<string, { competition: T['season']['competition']; matches: T[] }>();
  for (const match of matches) {
    const key = match.season.competition.id;
    let bucket = byCompetition.get(key);
    if (!bucket) {
      bucket = { competition: match.season.competition, matches: [] };
      byCompetition.set(key, bucket);
    }
    bucket.matches.push(match);
  }
  return [...byCompetition.values()];
}

type SquadRow = {
  shirtNumber: number | null;
  position: string | null;
  player: { position: string | null };
};

const LINE_ORDER = ['goalkeeper', 'defender', 'midfielder', 'attacker', 'other'] as const;
const LINE_LABEL: Record<(typeof LINE_ORDER)[number], string> = {
  goalkeeper: 'Arqueros',
  defender: 'Defensores',
  midfielder: 'Mediocampistas',
  attacker: 'Delanteros',
  other: 'Sin posición',
};

/** La plantilla se lee por líneas, no como una lista de treinta nombres. */
function groupSquadByLine<T extends SquadRow>(rows: T[]): Array<{ line: string; label: string; players: T[] }> {
  return LINE_ORDER.map((line) => ({
    line,
    label: LINE_LABEL[line],
    players: rows.filter((row) => {
      const pos = row.position ?? row.player.position;
      return line === 'other' ? !pos || !LINE_ORDER.includes(pos as never) : pos === line;
    }),
  })).filter((group) => group.players.length > 0);
}

type ConGeografia = {
  season: {
    competition: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      country: string | null;
      countryCode: string | null;
      flagUrl: string | null;
      continent: string | null;
      format: string;
    };
  };
};

/**
 * Los partidos de un día ordenados continente → país → torneo.
 *
 * Es la forma en que la home los muestra: una sola columna donde el hincha baja y encuentra su
 * país, en lugar de N columnas por liga donde tiene que buscar. El mismo orden que la
 * navegación, para que nadie tenga que reaprenderlo.
 */
function groupByGeography<T extends ConGeografia>(matches: T[]) {
  const porContinente = new Map<Continent, Map<string, Map<string, T[]>>>();

  for (const match of matches) {
    const c = match.season.competition;
    const continente = (c.continent ?? 'mundial') as Continent;
    const pais = c.countryCode ?? '';

    const paises = porContinente.get(continente) ?? new Map<string, Map<string, T[]>>();
    const torneos = paises.get(pais) ?? new Map<string, T[]>();
    torneos.set(c.id, [...(torneos.get(c.id) ?? []), match]);
    paises.set(pais, torneos);
    porContinente.set(continente, paises);
  }

  return CONTINENT_ORDER.filter((c) => porContinente.has(c)).map((continent) => {
    const paises = porContinente.get(continent) as Map<string, Map<string, T[]>>;
    return {
      continent,
      label: CONTINENT_LABEL[continent],
      countries: [...paises.entries()]
        .map(([code, torneos]) => {
          const primera = [...torneos.values()][0]?.[0]?.season.competition;
          /* Igual que arriba: sin código, ni nombre ni bandera. */
          return {
            code: code === '' ? null : code,
            name: code === '' ? null : (primera?.country ?? null),
            flagUrl: code === '' ? null : (primera?.flagUrl ?? null),
            competitions: [...torneos.values()]
              .map((lista) => ({
                competition: (lista[0] as T).season.competition,
                matches: lista,
              }))
              .sort(
                (a, b) =>
                  competitionRank(a.competition.format, a.competition.name) -
                    competitionRank(b.competition.format, b.competition.name) ||
                  a.competition.name.localeCompare(b.competition.name, 'es'),
              ),
          };
        })
        .sort((a, b) => countryRank(a.code) - countryRank(b.code)),
    };
  });
}
