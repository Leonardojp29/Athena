import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  clasificarRondas,
  escaleraDesde,
  gruposVigentes,
  ordenarEtapas,
  type Etapa,
  type Ronda,
  normalizarNombre,
  torneoDeTrofeo,
} from '@athena/domain';
import type { Prisma } from '@athena/database';
import { Memoria } from '../../shared/memoria.js';
import { PrismaService } from '../../shared/prisma.service.js';
import {
  CONFEDERATION_LABEL,
  CONFEDERATION_ORDER,
  CONTINENT_LABEL,
  CONTINENT_ORDER,
  competitionRank,
  continentalRank,
  countryRank,
  nationalRank,
  type Continent,
} from './regions.js';

const teamSummary = {
  select: {
    id: true,
    name: true,
    shortName: true,
    slug: true,
    logoUrl: true,
    /* Dos columnas más en la misma consulta: es lo que permite pintar el banco de cada equipo. */
    primaryColor: true,
    secondaryColor: true,
  },
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

/* Un partido que todavía se puede jugar: si no queda ninguno y hay jugados, el torneo terminó. */
const PENDIENTE = new Set(['scheduled', 'in_play', 'paused', 'postponed', 'suspended']);

/* Un partido programado que quedó atrás hace más de esto no se va a jugar: es basura del proveedor. */
const RANCIO_MS = 14 * 24 * 3600_000;

/* Cuántas rondas se mandan a cada lado de la que se juega. */
const VENTANA = 3;

/* La etapa sirve para separar las columnas acá adentro; afuera nadie la usa y no viaja. */
const sinEtapa = <T extends { etapa: unknown }>({ etapa: _etapa, ...resto }: T) => resto;

/** Un gol de la fase de grupos: lo mínimo para escribir "Pedro 12'" debajo del partido. */
export interface GolDeGrupo {
  id: string;
  kind: string;
  minute: number;
  extraMinute: number | null;
  detail: unknown;
  team: { id: string };
  player: { id: string; name: string; slug: string; photoUrl: string | null } | null;
}

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

/*
 * Cuántas alineaciones viajan con la vista de equipo. Cinco fechas es lo que se recorre con las
 * flechas de la tarjeta; más no aporta y cada una suma su HTML.
 */
const ALINEACIONES = 5;

/* Perú no tiene horario de verano: el desplazamiento fijo es correcto para siempre. */
const LIMA_OFFSET = '-05:00';

/* Cuántos movimientos por dirección: una tarjeta de altas y bajas, no un archivo del mercado. */
const MOVIMIENTOS = 12;

/*
 * El club del otro lado casi nunca está en Athena —la mayoría de los pases cruzan a ligas que no
 * cubrimos—, así que el nombre viaja siempre y el slug solo cuando se lo puede resolver. Sin el
 * nombre, la mitad de las filas serían mudas.
 */
const movimientoDeMercado = {
  fecha: true,
  clase: true,
  monto: true,
  entraANombre: true,
  saleDeNombre: true,
  player: { select: { name: true, slug: true, photoUrl: true, position: true } },
  entraA: { select: { name: true, slug: true, logoUrl: true } },
  saleDe: { select: { name: true, slug: true, logoUrl: true } },
} as const;
const DAY_MS = 86_400_000;

const SEGUNDOS_DE_MARCADORES = 5;

export interface MarcadorDePartido {
  id: string;
  status: string;
  statusDetail: string | null;
  elapsedMinutes: number | null;
  homeScore: number | null;
  awayScore: number | null;
  actualizadoEn: string;
}

export interface Marcadores {
  generadoEn: string;
  live: number;
  partidos: MarcadorDePartido[];
}

interface FilaDeMarcador {
  id: string;
  status: string;
  status_detail: string | null;
  elapsed_minutes: number | null;
  home_score: number | null;
  away_score: number | null;
  updated_at: Date;
}

@Injectable()
export class ViewsService {
  private readonly marcadoresRecientes = new Memoria<Marcadores>(1);

  constructor(private readonly prisma: PrismaService) {}

  async marcadores(): Promise<Marcadores> {
    const recordados = this.marcadoresRecientes.get('marcadores');
    if (recordados) return recordados;

    const filas = await this.prisma.$queryRaw<FilaDeMarcador[]>`
      SELECT id, status, status_detail, elapsed_minutes, home_score, away_score, updated_at
      FROM matches
      WHERE status IN ('in_play', 'paused')
         OR (status = 'finished'
             AND kickoff_utc > now() - interval '4 hours'
             AND updated_at > now() - interval '15 minutes')
      ORDER BY kickoff_utc`;

    const vista: Marcadores = {
      generadoEn: new Date().toISOString(),
      live: filas.filter((f) => f.status === 'in_play' || f.status === 'paused').length,
      partidos: filas.map((f) => ({
        id: f.id,
        status: f.status,
        statusDetail: f.status_detail,
        elapsedMinutes: f.elapsed_minutes,
        homeScore: f.home_score,
        awayScore: f.away_score,
        actualizadoEn: f.updated_at.toISOString(),
      })),
    };
    this.marcadoresRecientes.set('marcadores', vista, SEGUNDOS_DE_MARCADORES);
    return vista;
  }

  /**
   * El catálogo entero, ya ordenado continente → país → torneos, en dos ramas.
   *
   * Se arma en el API y no en la web porque el orden es una decisión de producto —Perú primero,
   * la liga antes que sus copas— y así el header, el índice y el buscador leen exactamente lo
   * mismo. Antes la web recibía una lista plana y agrupaba con un mapa de países propio.
   *
   * Las selecciones van en su propia rama: el Mundial y la Copa América llegan del proveedor sin
   * país, igual que la Libertadores, y mezclarlos escondía a la selección adentro del árbol de
   * clubes. En su rama no hay nivel de país, porque una selección no cuelga de un país: **es** uno.
   */
  async competitions() {
    const [clubes, selecciones] = await Promise.all([
      this.catalogoDe('clubs'),
      this.catalogoDe('national'),
    ]);
    return { clubes, selecciones };
  }

  private async catalogoDe(scope: 'clubs' | 'national') {
    const rows = await this.prisma.competition.findMany({
      relationLoadStrategy: JOIN,
      where: { isActive: true, scope },
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

    /* En selecciones el grupo es la confederación y el Mundial abre; en clubes, el continente. */
    const orden = scope === 'national' ? CONFEDERATION_ORDER : CONTINENT_ORDER;
    const etiqueta = scope === 'national' ? CONFEDERATION_LABEL : CONTINENT_LABEL;

    return orden
      .filter((c) => porContinente.has(c))
      .map((continent) => {
        const paises = porContinente.get(continent) as Map<string, typeof rows>;
        return {
          continent,
          label: etiqueta[continent],
          /*
           * Las copas de la confederación van sueltas y arriba de los países: la Libertadores es
           * fútbol sudamericano, no "internacional", y quien busca fútbol sudamericano la busca ahí.
           */
          competitions: [...(paises.get('') ?? [])].sort((a, b) =>
            scope === 'national'
              ? nationalRank(a.name) - nationalRank(b.name) || a.name.localeCompare(b.name, 'es')
              : continentalRank(a.name) - continentalRank(b.name) ||
                a.name.localeCompare(b.name, 'es'),
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

  async enVivo(): Promise<{ live: number }> {
    const live = await this.prisma.match.count({ where: { status: { in: ['in_play', 'paused'] } } });
    return { live };
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
     * A media mañana ningún partido del día terminó todavía, así que se busca el último día con
     * algo que contar dentro de una ventana de tres. Antes se pedían los tres días en paralelo y
     * se devolvía el primero con filas; ahora una sola consulta encuentra el día y ordena sus
     * jugadores, que es lo que permite rankear los setecientos de un sábado europeo en vez de los
     * cuarenta que entraban en el lote.
     */
    const [scorers, mejores] = await Promise.all([
      this.goleadoresDe(continente),
      this.performersOn(date, limite, continente),
    ]);

    return {
      continent: continente,
      scorers,
      date: mejores.date ?? date,
      esDeHoy: mejores.date === date,
      players: mejores.players,
    };
  }

  /*
   * Lo mejor del último día con fútbol, dentro de una ventana de tres.
   *
   * El ranking se hace en SQL y no en memoria: antes se pedían cuarenta filas **ordenadas por
   * nota** y recién después se reordenaban por lo que importa, así que en un sábado europeo con
   * setecientas filas el que hizo dos goles con 7,5 nunca entraba al lote. Ahora ordena la base y
   * se traen solo las que se muestran.
   *
   * El mínimo de minutos baja a veinte: con cuarenta y cinco quedaba afuera el suplente que entra
   * a los sesenta y hace dos, que es exactamente lo que este bloque busca contar.
   */
  private async performersOn(date: string, limite: number, continente: string) {
    const desde = new Date(new Date(`${date}T12:00:00${LIMA_OFFSET}`).getTime() - 2 * DAY_MS);
    const hasta = new Date(new Date(`${date}T12:00:00${LIMA_OFFSET}`).getTime() + DAY_MS);

    const ranking = await this.prisma.$queryRaw<Array<{ id: string; dia: Date }>>`
      WITH candidatas AS (
        SELECT s.id,
               (m.kickoff_utc - interval '5 hours')::date AS dia,
               coalesce(s.goals, 0) * 2 + coalesce(s.assists, 0) + s.rating::numeric / 10 AS puntaje
        FROM match_player_statistics s
        JOIN matches m ON m.id = s.match_id
        JOIN seasons se ON se.id = m.season_id
        JOIN competitions c ON c.id = se.competition_id
        WHERE m.status = 'finished'
          AND s.rating IS NOT NULL
          AND s.minutes_played >= ${MINUTOS_PARA_DESTACAR}
          AND m.kickoff_utc >= ${desde}
          AND m.kickoff_utc < ${hasta}
          AND c.continent = ${continente}
      )
      SELECT id, dia FROM candidatas
      WHERE dia = (SELECT max(dia) FROM candidatas)
      ORDER BY puntaje DESC
      LIMIT ${limite}`;

    if (ranking.length === 0) return { date: null, players: [] };

    const filas = await this.prisma.matchPlayerStatistics.findMany({
      relationLoadStrategy: JOIN,
      where: { id: { in: ranking.map((r) => r.id) } },
      select: {
        id: true,
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

    /* El `in` no conserva el orden: se reordena por el que devolvió la base. */
    const porId = new Map(filas.map((f) => [f.id, f]));
    return {
      date: enLima(ranking[0]!.dia),
      players: ranking.flatMap((r) => {
        const fila = porId.get(r.id);
        return fila ? [fila] : [];
      }),
    };
  }

  /** El índice de partidos: un día calendario de Lima, agrupado por competencia. */
  async matchesOnDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Fecha inválida');
    const start = new Date(`${date}T00:00:00${LIMA_OFFSET}`);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Fecha inválida');

    /*
     * En qué puesto llega cada uno. Sin esto, un Bournemouth contra Brentford y un puntero contra
     * el escolta se ven exactamente igual, y no lo son.
     *
     * Las dos consultas salen juntas y la de la tabla no espera a saber qué temporadas hay: pide
     * las de las temporadas en curso, que son las únicas donde "en qué puesto llega" significa
     * algo. Encadenarlas costaba dos viajes a la base, y desde fuera de región eso son cuatro
     * segundos en un día que todavía no está en caché.
     */
    const [matches, tabla] = await Promise.all([
      this.prisma.match.findMany({
        relationLoadStrategy: JOIN,
        where: { kickoffUtc: { gte: start, lt: new Date(start.getTime() + DAY_MS) } },
        select: { ...matchCard, seasonId: true },
        orderBy: { kickoffUtc: 'asc' },
        take: 300,
      }),
      this.prisma.standing.findMany({
        where: { season: { isCurrent: true } },
        select: { teamId: true, seasonId: true, position: true, points: true },
      }),
    ]);
    const posiciones = Object.fromEntries(
      tabla.map((fila) => [`${fila.seasonId}:${fila.teamId}`, { puesto: fila.position, puntos: fila.points }]),
    );

    const sinTemporada = matches.map(({ seasonId: _, ...resto }) => resto);

    return {
      date,
      total: matches.length,
      live: matches.filter((m) => m.status === 'in_play' || m.status === 'paused').length,
      /* La clave es `seasonId:teamId`: un club juega su liga y su copa con puestos distintos. */
      posiciones,
      puestoPorPartido: Object.fromEntries(
        matches.flatMap((m) => {
          const local = posiciones[`${m.seasonId}:${m.homeTeam.id}`];
          const visita = posiciones[`${m.seasonId}:${m.awayTeam.id}`];
          return local && visita ? [[m.id, { local: local.puesto, visita: visita.puesto }]] : [];
        }),
      ),
      sections: groupByCompetition(sinTemporada),
      geography: groupByGeography(sinTemporada),
    };
  }

  /**
   * Cuántos partidos tiene cada día de una ventana.
   *
   * La tira de días eran siete cajitas idénticas y ninguna decía nada: elegir el sábado o el martes
   * costaba lo mismo aunque uno tenga cuarenta partidos y el otro tres. Es un conteo agrupado, no
   * siete consultas.
   */
  async calendarioSemana(desde: string, dias: number) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new BadRequestException('Fecha inválida');
    const inicio = new Date(`${desde}T00:00:00${LIMA_OFFSET}`);
    if (Number.isNaN(inicio.getTime())) throw new BadRequestException('Fecha inválida');
    const cuantos = Math.min(Math.max(dias, 1), 31);
    const fin = new Date(inicio.getTime() + cuantos * DAY_MS);

    const filas = await this.prisma.match.findMany({
      where: { kickoffUtc: { gte: inicio, lt: fin } },
      select: { kickoffUtc: true, status: true },
    });

    const porDia = new Map<string, { total: number; vivos: number }>();
    for (let i = 0; i < cuantos; i += 1) {
      porDia.set(enLima(new Date(inicio.getTime() + i * DAY_MS)), { total: 0, vivos: 0 });
    }
    for (const fila of filas) {
      const dia = porDia.get(enLima(fila.kickoffUtc));
      if (!dia) continue;
      dia.total += 1;
      if (fila.status === 'in_play' || fila.status === 'paused') dia.vivos += 1;
    }

    return [...porDia].map(([fecha, cuenta]) => ({ fecha, ...cuenta }));
  }

  /*
   * Todo cuelga del slug y de "la temporada vigente", así que nada tiene que esperar a nada: pedir
   * la competencia, después su temporada y después la tabla eran tres viajes en fila.
   */
  async competition(slug: string, year: number | null = null) {
    /* Con año, el archivo de esa temporada; sin año, la vigente. El resto de la vista no cambia. */
    const temporadaVigente = year
      ? { competition: { slug }, year }
      : { competition: { slug }, isCurrent: true };

    const [
      competition,
      season,
      standings,
      recent,
      upcoming,
      scorers,
      assisters,
      once,
      todos,
      onceDelTorneo,
      seasons,
    ] = await Promise.all([
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
      /*
       * Todos los partidos de la temporada: con 142 en una copa es una sola consulta, y de ella salen
       * el cuadro, los partidos ronda por ronda y el estado del torneo.
       */
      this.partidosDeTemporada(temporadaVigente),
      this.onceDelTorneo(slug, year),
      /* Las temporadas con datos: ofrecer una vacía es prometer de más. */
      this.temporadasCon(slug),
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

    const rondas = clasificarRondas([...new Set(todos.map((m) => m.round ?? ''))].filter(Boolean));

    /*
     * En qué momento está la temporada. Sin esto, la Copa del Rey decía "en juego" cuatro meses después
     * de la final: la ronda en curso se deduce del último partido jugado cuando no queda ninguno por
     * jugar, y un torneo terminado se leía como uno vivo.
     *
     * Dos cosas que la base enseñó y que una regla ingenua no ve. Un partido programado que ya pasó
     * hace semanas no es un partido por jugar sino un dato podrido —la FA Cup arrastra dos replays de
     * agosto de 2025 que nadie va a jugar—, y una copa no termina hasta que se juega su final: la Copa
     * do Brasil no tiene nada programado porque el proveedor todavía no publicó los cuartos, no porque
     * haya campeón.
     */
    const limiteRancio = Date.now() - RANCIO_MS;
    const porJugar = todos.some(
      (m) => PENDIENTE.has(m.status) && m.kickoffUtc.getTime() > limiteRancio,
    );
    const jugados = todos.filter((m) => m.status === 'finished').length;
    const eliminatorias = rondas.filter((r) => r.eliminatoria && r.etapa === 'final');
    const ultima = eliminatorias.at(-1);
    const cuadroCompleto =
      ultima === undefined ||
      new Set(
        todos
          .filter((m) => m.round === ultima.round)
          .map((m) => [m.homeTeam.id, m.awayTeam.id].sort().join('|')),
      ).size === 1;

    const estado: EstadoDeTemporada =
      jugados === 0 ? 'por-empezar' : porJugar || !cuadroCompleto ? 'en-juego' : 'terminado';

    /* La ronda en curso solo existe mientras el torneo lo esté: después, nada está "en juego". */
    const enCurso = estado === 'en-juego' ? jornada : null;

    /*
     * A qué grupo pertenece cada equipo. Un mismo equipo puede estar en dos tablas —su grupo y la de
     * mejores terceros de un Mundial—, así que manda la más chica, que es su grupo de verdad: con la
     * otra, un partido entre dos terceros terminaba contado en la tabla de terceros y su grupo se
     * quedaba sin él.
     */
    const grupoDe = new Map<string, string>();
    for (const fila of [...standings].sort(
      (a, b) => (groups.get(a.groupLabel)?.length ?? 0) - (groups.get(b.groupLabel)?.length ?? 0),
    )) {
      if (!grupoDe.has(fila.team.id)) grupoDe.set(fila.team.id, fila.groupLabel);
    }

    const rondasDePartidos = this.partidosPorRonda(todos, rondas, jornada, enCurso, grupoDe);

    /*
     * Los goles de la fase de grupos, para que cada partido pueda mostrar quién los hizo.
     *
     * Es una consulta más y solo cuando el torneo tiene grupos: son los cien partidos de una
     * Libertadores, no los trescientos ochenta de una liga. El resto de la vista no los lleva —una
     * fila de resultados no muestra goleadores— así que no se pagan donde no se usan.
     */
    const idsDeGrupos = [
      ...rondasDePartidos.grupos.flatMap((r) => r.partidos.map((m) => m.id)),
      /*
       * Y las rondas cortas de la ventana: una final es un partido solo en un panel entero, y sin
       * sus goleadores es una tarjeta vacía. Cuatro partidos por ronda como tope mantiene esto en
       * los cruces decisivos y fuera de las jornadas de liga.
       */
      ...rondasDePartidos.ventana
        .filter((r) => r.partidos.length <= 4)
        .flatMap((r) => r.partidos.map((m) => m.id)),
    ];
    const golesPorPartido = new Map<string, GolDeGrupo[]>();
    if (idsDeGrupos.length > 0) {
      const goles = await this.prisma.matchEvent.findMany({
        relationLoadStrategy: JOIN,
        where: { matchId: { in: idsDeGrupos }, kind: { in: ['goal', 'penalty_goal', 'own_goal'] } },
        orderBy: [
          { minute: 'asc' },
          { extraMinute: { sort: 'asc', nulls: 'first' } },
          { id: 'asc' },
        ],
        select: {
          id: true,
          matchId: true,
          kind: true,
          minute: true,
          extraMinute: true,
          detail: true,
          team: { select: { id: true } },
          player: playerLink,
        },
      });
      for (const gol of goles) {
        const { matchId, ...evento } = gol;
        golesPorPartido.set(matchId, [...(golesPorPartido.get(matchId) ?? []), evento]);
      }
    }
    const conGoles = (ronda: (typeof rondasDePartidos.grupos)[number]) => ({
      ...ronda,
      partidos: ronda.partidos.map((m) => ({ ...m, eventos: golesPorPartido.get(m.id) ?? [] })),
      bloques: ronda.bloques.map((b) => ({
        ...b,
        partidos: b.partidos.map((m) => ({ ...m, eventos: golesPorPartido.get(m.id) ?? [] })),
      })),
    });

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
      /*
       * Las etapas del torneo, ya ordenadas: una liga devuelve una lista vacía porque no tiene
       * ninguna ronda eliminatoria ni grupos que mostrar aparte de su tabla.
       */
      /*
       * Una liga no tiene etapas: la fase regular es su tabla y la liguilla —si llega— es lo único que
       * se dibuja como cuadro. Sin esto, la Liga MX mostraba "fase de grupos" en lugar de su tabla.
       */
      etapas: this.fasesDe(
        todos,
        rondas,
        enCurso,
        competition.format === 'league',
        estado === 'terminado',
      ),
      etapaEnJuego: rondas.find((r) => r.round === enCurso)?.etapa ?? null,
      estado,
      /* Los partidos agrupados por ronda, para navegarlos de una en una en lugar de dos listas. */
      porRonda: rondasDePartidos.ventana.map(conGoles),
      /* La fase de grupos completa, con los goles de cada partido: el bloque de grupos necesita las
         tres fechas —no la ventana— y quién marcó en cada una. */
      rondasDeGrupos: rondasDePartidos.grupos.map(conGoles),
      /*
       * El nombre de la jornada en español, para no traducirlo en cada vista. Solo cuando el dominio
       * la reconoce como ronda de copa: la jornada de una liga —"Clausura - 5"— la rotula la web con
       * su propio diccionario de fases.
       */
      roundLabel: rondas.find((r) => r.round === jornada)?.label ?? null,
      onceDelTorneo,
      seasons,
    };
  }

  /**
   * Todos los partidos de una temporada con sus dos equipos. Lo comparten la vista de competencia
   * —que arma el cuadro y las rondas— y la calculadora, que los necesita enteros.
   */
  private partidosDeTemporada(temporada: Prisma.SeasonWhereInput) {
    return this.prisma.match.findMany({
      relationLoadStrategy: JOIN,
      where: { season: temporada },
      orderBy: { kickoffUtc: 'asc' },
      select: {
        id: true,
        kickoffUtc: true,
        status: true,
        statusDetail: true,
        elapsedMinutes: true,
        homeScore: true,
        awayScore: true,
        round: true,
        homeTeam: teamSummary,
        awayTeam: teamSummary,
      },
    });
  }

  /**
   * Lo que necesita la calculadora y nada más.
   *
   * La vista de competencia ya carga estos mismos partidos, pero solo publica una ventana de siete
   * fechas porque una copa tiene doscientos y pesan un mega. Acá hacen falta los trescientos seis
   * —sin ellos no hay tabla anual— así que viajan como tuplas: los mismos datos ocupan ochenta KB
   * en vez de un mega, y doce al comprimirse.
   */
  async calculadora(slug: string) {
    const temporadaVigente = { competition: { slug }, isCurrent: true };

    const [competencia, partidos, tablas] = await Promise.all([
      this.prisma.competition.findUnique({
        where: { slug },
        select: { name: true, slug: true, logoUrl: true },
      }),
      this.partidosDeTemporada(temporadaVigente),
      this.prisma.standing.findMany({
        where: { season: temporadaVigente },
        orderBy: [{ groupLabel: 'asc' }, { position: 'asc' }],
        select: { groupLabel: true, teamId: true },
      }),
    ]);
    if (!competencia) return null;

    const temporada = await this.prisma.season.findFirst({
      where: temporadaVigente,
      select: { year: true },
    });

    /* Un programado que quedó dos semanas atrás es basura del proveedor, no un partido por jugar. */
    const limiteRancio = Date.now() - RANCIO_MS;
    const vivos = partidos.filter(
      (m) =>
        !PENDIENTE.has(m.status) ||
        m.status === 'in_play' ||
        m.status === 'paused' ||
        m.kickoffUtc.getTime() > limiteRancio,
    );

    /* El color del club: la tarjeta que se comparte se pinta con él y deja de ser genérica. */
    const colores = new Map(
      (
        await this.prisma.team.findMany({
          where: { id: { in: [...new Set(vivos.flatMap((m) => [m.homeTeam.id, m.awayTeam.id]))] } },
          select: { id: true, primaryColor: true },
        })
      ).map((t) => [t.id, t.primaryColor]),
    );

    const equipos = new Map<string, [string, string, string, string | null, string | null]>();
    for (const partido of vivos) {
      for (const equipo of [partido.homeTeam, partido.awayTeam]) {
        if (!equipos.has(equipo.id)) {
          equipos.set(equipo.id, [
            equipo.id,
            equipo.name,
            equipo.slug,
            equipo.logoUrl,
            colores.get(equipo.id) ?? null,
          ]);
        }
      }
    }

    const indices = new Map([...equipos.keys()].map((id, indice) => [id, indice]));
    const enJuego = vivos.find((m) => m.status === 'in_play' || m.status === 'paused');
    const enCurso = vivos.find((m) => PENDIENTE.has(m.status));

    const porTabla = new Map<string, string[]>();
    for (const fila of tablas) {
      const lista = porTabla.get(fila.groupLabel) ?? [];
      lista.push(fila.teamId);
      porTabla.set(fila.groupLabel, lista);
    }

    return {
      competencia: {
        nombre: competencia.name,
        slug: competencia.slug,
        logo: competencia.logoUrl,
      },
      temporada: temporada?.year ?? null,
      ronda: (enJuego ?? enCurso)?.round ?? null,
      hayEnVivo: enJuego !== undefined,
      equipos: [...equipos.values()],
      partidos: vivos.map((m) => [
        m.id,
        m.round ?? '',
        indices.get(m.homeTeam.id) ?? 0,
        indices.get(m.awayTeam.id) ?? 0,
        m.status,
        m.homeScore,
        m.awayScore,
        m.kickoffUtc.toISOString(),
      ]),
      ordenOficial: [...porTabla.entries()].map(([etiqueta, ids]) => ({
        etiqueta,
        equipos: ids.flatMap((id) => {
          const indice = indices.get(id);
          return indice === undefined ? [] : [indice];
        }),
      })),
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
     * `OVER ()` cuenta toda la historia aunque solo se devuelvan los últimos doce cruces. Todas las
     * ventanas comparten la especificación vacía, así que Postgres las resuelve en un solo nodo:
     * sumar el corte por sede no cuesta un recorrido más.
     */
    const filas = await this.prisma.$queryRaw<FilaHistorial[]>`
      WITH actual AS (
        SELECT home_team_id, away_team_id FROM matches WHERE id = ${matchId}::uuid
      ),
      cruces AS (
        SELECT m.id, m.kickoff_utc, m.home_score, m.away_score, m.round,
               m.home_team_id, m.away_team_id, a.home_team_id AS local_actual,
               a.away_team_id AS visita_actual, m.season_id
        FROM matches m
        CROSS JOIN actual a
        WHERE m.id <> ${matchId}::uuid AND m.status = 'finished'
          AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL
          AND ((m.home_team_id = a.home_team_id AND m.away_team_id = a.away_team_id)
            OR (m.home_team_id = a.away_team_id AND m.away_team_id = a.home_team_id))
      )
      SELECT c.id, c.kickoff_utc, c.home_score, c.away_score, c.round,
             hl.name AS home_name, hl.short_name AS home_short, hl.slug AS home_slug,
             hl.logo_url AS home_logo,
             aw.name AS away_name, aw.short_name AS away_short, aw.slug AS away_slug,
             aw.logo_url AS away_logo,
             co.name AS competition_name, co.slug AS competition_slug,
             co.logo_url AS competition_logo, se.year AS season_year,
             count(*) OVER ()::int AS jugados,
             min(c.kickoff_utc) OVER () AS desde_utc,
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
               OVER ()::int AS goles_visita,
             -- El corte por sede: es lo único del historial que habla del partido de hoy, porque hoy
             -- se juega en una de las dos casas.
             sum(CASE WHEN c.home_team_id = c.local_actual THEN 1 ELSE 0 END)
               OVER ()::int AS casa_local_jugados,
             sum(CASE WHEN c.home_team_id = c.local_actual AND c.home_score > c.away_score THEN 1 ELSE 0 END)
               OVER ()::int AS casa_local_gano,
             sum(CASE WHEN c.home_team_id = c.local_actual AND c.home_score = c.away_score THEN 1 ELSE 0 END)
               OVER ()::int AS casa_local_empato,
             sum(CASE WHEN c.home_team_id = c.visita_actual THEN 1 ELSE 0 END)
               OVER ()::int AS casa_visita_jugados,
             sum(CASE WHEN c.home_team_id = c.visita_actual AND c.home_score > c.away_score THEN 1 ELSE 0 END)
               OVER ()::int AS casa_visita_gano,
             sum(CASE WHEN c.home_team_id = c.visita_actual AND c.home_score = c.away_score THEN 1 ELSE 0 END)
               OVER ()::int AS casa_visita_empato
      FROM cruces c
      JOIN teams hl ON hl.id = c.home_team_id
      JOIN teams aw ON aw.id = c.away_team_id
      JOIN seasons se ON se.id = c.season_id
      JOIN competitions co ON co.id = se.competition_id
      ORDER BY c.kickoff_utc DESC
      LIMIT 12`;

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
            desde_utc: primera.desde_utc,
            casa_local: {
              jugados: primera.casa_local_jugados,
              gano: primera.casa_local_gano,
              empato: primera.casa_local_empato,
            },
            casa_visita: {
              jugados: primera.casa_visita_jugados,
              gano: primera.casa_visita_gano,
              empato: primera.casa_visita_empato,
            },
          }
        : null,
      ultimos: filas,
    };
  }

  /** Las temporadas de una competencia que tienen partidos. */
  private async temporadasCon(slug: string): Promise<number[]> {
    const filas = await this.prisma.$queryRaw<Array<{ year: number }>>`
      SELECT se.year
      FROM seasons se
      JOIN competitions c ON c.id = se.competition_id
      WHERE c.slug = ${slug} AND EXISTS (SELECT 1 FROM matches m WHERE m.season_id = se.id)
      ORDER BY se.year DESC`;
    return filas.map((f) => f.year);
  }

  /**
   * El once del torneo y su mejor jugador: los mejores por puesto en toda la temporada.
   *
   * Pide un mínimo de partidos para entrar —sin eso, un suplente con una gran actuación le gana el
   * puesto a quien la jugó entera— y usa la nota acumulada de la temporada, que es la que el
   * proveedor calcula sobre todos sus partidos.
   *
   * Resuelve la temporada en SQL en lugar de recibir el año ya buscado: así entra en la misma tanda
   * paralela que el resto de la vista y no cuesta un viaje extra a Supabase.
   */
  private async onceDelTorneo(slug: string, year: number | null): Promise<OnceDelTorneo | null> {
    const filas = await this.prisma.$queryRaw<FilaOnceTorneo[]>`
      WITH notas AS (
        SELECT p.position, s.rating, s.goals, s.assists, s.appearances,
               p.id AS player_id, p.name AS player_name, p.slug AS player_slug, p.photo_url,
               t.name AS team_name, t.short_name AS team_short, t.slug AS team_slug,
               t.logo_url AS team_logo,
               row_number() OVER (
                 PARTITION BY p.position ORDER BY s.rating DESC NULLS LAST, s.appearances DESC
               ) AS puesto
        FROM player_season_statistics s
        JOIN seasons se ON se.id = s.season_id
        JOIN competitions c ON c.id = se.competition_id
        JOIN players p ON p.id = s.player_id
        JOIN teams t ON t.id = s.team_id
        WHERE c.slug = ${slug}
          AND CASE WHEN ${year}::int IS NULL THEN se.is_current ELSE se.year = ${year}::int END
          AND s.rating IS NOT NULL AND p.position IS NOT NULL
          AND s.appearances >= 3
      )
      SELECT position, rating::text AS rating, goals, assists, appearances,
             player_id, player_name, player_slug, photo_url,
             team_name, team_short, team_slug, team_logo
      FROM notas
      WHERE (position = 'goalkeeper' AND puesto <= 1)
         OR (position = 'defender' AND puesto <= 4)
         OR (position = 'midfielder' AND puesto <= 4)
         OR (position = 'attacker' AND puesto <= 2)
      ORDER BY array_position(ARRAY['goalkeeper','defender','midfielder','attacker'], position),
               rating DESC`;

    if (filas.length < 6) return null;

    /* El mejor del torneo es el de mejor nota entre los once, no el goleador: eso ya se muestra aparte. */
    const mejor =
      [...filas].sort((a, b) => Number(b.rating ?? 0) - Number(a.rating ?? 0))[0] ?? null;
    return { players: filas, best: mejor };
  }

  /**
   * El cuadro de una copa: las llaves de cada ronda con sus partidos, el global y quién pasó.
   *
   * Quién pasó no se deduce del resultado sino de la ronda siguiente: si el equipo aparece más
   * adelante, avanzó. Es la única forma honesta de resolver una llave que se definió por penales,
   * dato que el proveedor no publica en el partido.
   */
  private cuadroDe(
    partidos: PartidoDeCuadro[],
    rondas: Ronda[],
    etapa: Etapa,
    enCurso: string | null,
  ): RondaDeCuadro[] {
    /*
     * Un rótulo es una columna. El proveedor manda "Preliminary Round" y "Preliminary Round Replays"
     * como rondas distintas, pero un replay es otro partido de la misma llave y la FA Cup mostraba dos
     * columnas iguales; agrupar por rótulo las junta sin fusionar lo que de verdad es distinto —el
     * Apertura y el Clausura tienen cada uno su final y el rótulo lo dice—.
     */
    const columnas = new Map<string, { label: string; rank: number; rounds: string[] }>();
    for (const ronda of rondas) {
      const columna = columnas.get(ronda.label);
      if (columna) columna.rounds.push(ronda.round);
      else
        columnas.set(ronda.label, { label: ronda.label, rank: ronda.rank, rounds: [ronda.round] });
    }

    /* Para cada columna, los equipos que juegan alguna posterior: esos son los que pasaron. */
    const equiposPorRango = [...columnas.values()].map((columna) => ({
      rank: columna.rank,
      equipos: new Set(
        partidos
          .filter((m) => columna.rounds.includes(m.round ?? ''))
          .flatMap((m) => [m.homeTeam.id, m.awayTeam.id]),
      ),
    }));

    const dibujadas = rondas
      .filter((ronda) => ronda.eliminatoria && ronda.etapa === etapa)
      .filter((ronda, i, todas) => todas.findIndex((r) => r.label === ronda.label) === i)
      .map((ronda) => {
        const columna = columnas.get(ronda.label) as { rounds: string[] };
        const suyos = partidos.filter((m) => columna.rounds.includes(m.round ?? ''));
        const masAdelante = new Set(
          equiposPorRango.filter((r) => r.rank > ronda.rank).flatMap((r) => [...r.equipos]),
        );
        const esUltima = !equiposPorRango.some((r) => r.rank > ronda.rank);

        /* Ida y vuelta son el mismo cruce: la clave es el par de equipos, sin importar el orden. */
        const llaves = new Map<string, PartidoDeCuadro[]>();
        for (const partido of suyos) {
          const clave = [partido.homeTeam.id, partido.awayTeam.id].sort().join('|');
          llaves.set(clave, [...(llaves.get(clave) ?? []), partido]);
        }

        return {
          round: ronda.round,
          label: ronda.label,
          enJuego: columna.rounds.includes(enCurso ?? ''),
          ties: [...llaves.values()]
            .map((legs) => {
              const ordenados = [...legs].sort(
                (a, b) => a.kickoffUtc.getTime() - b.kickoffUtc.getTime(),
              );
              const primero = ordenados[0] as PartidoDeCuadro;
              const local = primero.homeTeam;
              const visita = primero.awayTeam;

              const jugados = ordenados.filter(
                (m) => m.status === 'finished' && m.homeScore !== null && m.awayScore !== null,
              );
              const global = jugados.reduce(
                (acc, m) => ({
                  local:
                    acc.local +
                    (m.homeTeam.id === local.id ? (m.homeScore ?? 0) : (m.awayScore ?? 0)),
                  visita:
                    acc.visita +
                    (m.homeTeam.id === visita.id ? (m.homeScore ?? 0) : (m.awayScore ?? 0)),
                }),
                { local: 0, visita: 0 },
              );

              /*
               * Quién pasó lo dice la ronda siguiente. En la última no hay ronda siguiente, así que
               * ahí —y solo ahí— lo dice el global, siempre que sea decisivo: una final igualada se
               * define por penales y el proveedor no publica la tanda.
               */
              const decisivo = jugados.length > 0 && global.local !== global.visita;
              const paso = masAdelante.has(local.id)
                ? local.id
                : masAdelante.has(visita.id)
                  ? visita.id
                  : esUltima && decisivo
                    ? global.local > global.visita
                      ? local.id
                      : visita.id
                    : null;

              return {
                homeTeam: local,
                awayTeam: visita,
                legs: ordenados,
                aggregate: jugados.length > 0 ? global : null,
                advancedTeamId: paso,
              };
            })
            .sort((a, b) => a.legs[0]!.kickoffUtc.getTime() - b.legs[0]!.kickoffUtc.getTime()),
        };
      })
      .filter((ronda) => ronda.ties.length > 0);

    return etapa === 'final'
      ? [...dibujadas, ...this.escaleraPendiente(dibujadas, rondas)]
      : dibujadas;
  }

  /**
   * Las rondas que faltan para llegar a la final, vacías y marcadas.
   *
   * Con ocho llaves en octavos ya se sabe que vienen cuartos, semis y final aunque el proveedor no
   * haya publicado un solo partido, porque una eliminatoria se parte en dos cada vez. Es lo que
   * permite mostrar el camino completo al título en lugar de una columna suelta; el dominio se niega
   * a deducirlo cuando el número de llaves no es potencia de dos.
   */
  private escaleraPendiente(dibujadas: RondaDeCuadro[], rondas: Ronda[]): RondaDeCuadro[] {
    /* Desde la más profunda que ya existe: la de más atrás puede tener otro tamaño —el "Round of 32"
       de la Sudamericana son ocho llaves, no dieciséis— y la escalera saldría corrida. */
    const ultima = dibujadas.at(-1);
    if (!ultima) return [];

    const rangos = new Set(
      dibujadas.map((d) => rondas.find((r) => r.round === d.round)?.rank ?? 0),
    );
    return escaleraDesde(ultima.ties.length)
      .filter((escalon) => !rangos.has(escalon.rank))
      .map((escalon) => ({
        round: `por-definir-${escalon.rank}`,
        label: escalon.label,
        enJuego: false,
        ties: [],
        porDefinir: escalon.llaves,
      }));
  }

  /**
   * Los partidos de la temporada agrupados por ronda, en una ventana alrededor de la que se juega.
   *
   * Reemplaza a "próximos partidos" y "últimos resultados", que eran dos listas con el mismo contenido
   * partido en dos: la ronda en curso ya trae lo que viene y la anterior lo que pasó. La ventana es de
   * tres rondas para cada lado —siete paneles— porque una Conference League tiene 210 partidos en la
   * temporada y mandarlos todos engorda la página sin que nadie los mire.
   *
   * El orden sale de la fecha del primer partido de cada ronda y no del rango: entre dos fechas de una
   * liga el rango es el mismo, y ordenar "Clausura - 10" alfabéticamente lo pondría antes de la 2.
   */
  private partidosPorRonda(
    partidos: PartidoDeCuadro[],
    rondas: Ronda[],
    jornada: string | null,
    enCurso: string | null,
    grupoDe: Map<string, string>,
  ): { ventana: RondaDePartidos[]; grupos: RondaDePartidos[] } {
    const columnas = new Map<
      string,
      { label: string; etapa: Etapa | null; eliminatoria: boolean; partidos: PartidoDeCuadro[] }
    >();
    for (const ronda of rondas) {
      const suyos = partidos.filter((m) => m.round === ronda.round);
      if (suyos.length === 0) continue;
      const columna = columnas.get(ronda.label);
      if (columna) columna.partidos.push(...suyos);
      else
        columnas.set(ronda.label, {
          label: ronda.label,
          etapa: ronda.etapa,
          eliminatoria: ronda.eliminatoria,
          partidos: [...suyos],
        });
    }

    const ordenadas = [...columnas.values()]
      .map((columna) => {
        const suyos = columna.partidos.sort(
          (a, b) => a.kickoffUtc.getTime() - b.kickoffUtc.getTime(),
        );
        return {
          label: columna.label,
          etapa: columna.etapa,
          enJuego: false,
          partidos: suyos,
          bloques: this.bloquesDe(columna, suyos, grupoDe),
        };
      })
      .sort((a, b) => a.partidos[0]!.kickoffUtc.getTime() - b.partidos[0]!.kickoffUtc.getTime());

    const rotuloDe = (round: string | null) =>
      round ? (rondas.find((r) => r.round === round)?.label ?? null) : null;
    const enJuego = rotuloDe(enCurso);
    for (const columna of ordenadas) columna.enJuego = columna.label === enJuego;

    /* Sin ronda en curso, la ventana se abre donde está el torneo: la jornada del último partido. */
    const centro = Math.max(
      0,
      ordenadas.findIndex((c) => c.label === (enJuego ?? rotuloDe(jornada))),
    );
    const desde = Math.max(0, Math.min(centro - VENTANA, ordenadas.length - (VENTANA * 2 + 1)));
    return {
      ventana: ordenadas.slice(desde, desde + VENTANA * 2 + 1).map(sinEtapa),
      /*
       * La fase de grupos, entera y sin ventana: el bloque de grupos muestra los partidos de cada
       * grupo y con las siete rondas de la ventana un Mundial mostraba una sola de sus tres fechas.
       */
      grupos: ordenadas.filter((c) => c.etapa === 'grupos').map(sinEtapa),
    };
  }

  /**
   * En qué se parte una ronda para que se entienda.
   *
   * Una ronda de dieciséis partidos no se lee: son ocho llaves con ida y vuelta y, sin decirlo, el
   * mismo cruce aparece dos veces sin explicación. Y una fecha de la fase de grupos son ocho grupos
   * distintos jugando lo suyo, así que el grupo es tan importante como el día.
   *
   * Devuelve vacío cuando no hay nada que separar —una final, una fecha de liga—: ahí un encabezado
   * de más es ruido y la lista va derecha.
   */
  private bloquesDe(
    columna: { etapa: Etapa | null; eliminatoria: boolean },
    partidos: PartidoDeCuadro[],
    grupoDe: Map<string, string>,
  ): Array<{ titulo: string; partidos: PartidoDeCuadro[] }> {
    if (columna.etapa === 'grupos') {
      /* El grupo sale de la tabla: la ronda del proveedor dice "Group Stage - 3" y no de qué grupo. */
      const porGrupo = new Map<string, PartidoDeCuadro[]>();
      for (const partido of partidos) {
        const grupo = grupoDe.get(partido.homeTeam.id) ?? grupoDe.get(partido.awayTeam.id);
        if (grupo === undefined) return [];
        porGrupo.set(grupo, [...(porGrupo.get(grupo) ?? []), partido]);
      }
      /*
       * También con un solo grupo: la Eurocopa parte sus rondas por grupo —"Group A - 1"— así que
       * cada ronda trae un grupo entero y nada más. Sin este bloque, el detalle del grupo no tenía
       * de dónde sacar sus fechas y la fase de grupos entera quedaba sin abrir.
       */
      return [...porGrupo.entries()]
        .sort(([a], [b]) => a.localeCompare(b, 'es'))
        .map(([titulo, suyos]) => ({ titulo, partidos: suyos }));
    }

    if (!columna.eliminatoria) return [];

    /* Ida y vuelta: el mismo cruce jugado dos veces. El orden ya es cronológico. */
    const vistos = new Set<string>();
    const ida: PartidoDeCuadro[] = [];
    const vuelta: PartidoDeCuadro[] = [];
    for (const partido of partidos) {
      const clave = [partido.homeTeam.id, partido.awayTeam.id].sort().join('|');
      if (vistos.has(clave)) vuelta.push(partido);
      else {
        vistos.add(clave);
        ida.push(partido);
      }
    }
    return vuelta.length === 0
      ? []
      : [
          { titulo: 'Ida', partidos: ida },
          { titulo: 'Vuelta', partidos: vuelta },
        ];
  }

  /**
   * Las etapas de la competencia en el orden en que se muestran.
   *
   * Primero la que se está jugando y después el resto por importancia, así la página se reordena sola
   * cuando cambia la temporada: mientras van los octavos manda el cuadro, y cuando arranca la fase de
   * grupos manda la fase de grupos. La etapa de grupos no trae llaves —sus tablas ya viajan en
   * `standingGroups`— y la final aparece vacía mientras haya grupos por terminar, para poder decir
   * que el cuadro todavía no está definido.
   *
   * Con el torneo terminado esa promesa ya no corresponde: unas eliminatorias son todas fechas y
   * nunca tienen llaves, así que anunciar un cuadro que no va a existir es peor que no decir nada.
   */
  private fasesDe(
    partidos: PartidoDeCuadro[],
    rondas: Ronda[],
    rondaActual: string | null,
    esLiga: boolean,
    terminado = false,
  ) {
    const enJuego = rondas.find((r) => r.round === rondaActual)?.etapa ?? null;
    const hayGrupos = !esLiga && rondas.some((r) => r.etapa === 'grupos');

    return ordenarEtapas(enJuego)
      .map((etapa) => ({
        etapa,
        enJuego: etapa === enJuego,
        rondas: etapa === 'grupos' ? [] : this.cuadroDe(partidos, rondas, etapa, rondaActual),
      }))
      .filter((bloque) =>
        bloque.etapa === 'grupos'
          ? hayGrupos
          : bloque.rondas.length > 0 || (bloque.etapa === 'final' && hayGrupos && !terminado),
      );
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
        /*
         * Solo clubes. El catálogo le da continente también a las Eliminatorias, la Copa América y
         * la Nations League, así que sin este filtro el líder de Europa eran los 16 goles de
         * Haaland con Noruega dentro de una tarjeta rotulada "temporada".
         */
        WHERE se.is_current AND c.is_active AND c.scope = 'clubs' AND c.continent = ${continente}
        GROUP BY s.player_id
        /*
         * El filtro de goles va acá y no en el WHERE: allí descartaba la fila entera antes de
         * agrupar, así que los partidos y las asistencias solo contaban las competencias donde el
         * jugador había marcado. Zampedri mostraba 24 partidos en vez de 26.
         */
        HAVING sum(s.goals) > 0
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
  /**
   * El 404 de un slug, con la mudanza si la hubo.
   *
   * Un slug cambia cuando el jugador nació abreviado —"j-vidales"— y llegó su nombre completo, o
   * cuando una selección dejó de llamarse "spain". El enlace viejo no puede morir por eso, así que el
   * 404 viaja con el slug nuevo y la página redirige en lugar de mandar a la de "no existe".
   */
  private async noEncontrado(
    entityType: 'player' | 'team',
    slug: string,
    mensaje: string,
  ): Promise<NotFoundException> {
    const alias = await this.prisma.slugAlias.findUnique({
      where: { entityType_slug: { entityType, slug } },
      select: { entityId: true },
    });
    if (!alias) return new NotFoundException(mensaje);

    const destino =
      entityType === 'player'
        ? await this.prisma.player.findUnique({ where: { id: alias.entityId }, select: { slug: true } })
        : await this.prisma.team.findUnique({ where: { id: alias.entityId }, select: { slug: true } });

    return destino
      ? new NotFoundException({ message: mensaje, movedTo: destino.slug })
      : new NotFoundException(mensaje);
  }

  async team(slug: string) {
    const ultimoJugado = { team: { slug }, match: { status: 'finished' } };
    /* El mercado que a alguien le importa es el de esta temporada, no el de 2014. */
    const desdeMercado = new Date(Date.now() - 400 * 24 * 3600_000);
    const [team, standings, historial, recent, upcoming, squad, scorers, alineaciones, notas, altas, bajas] =
      await Promise.all([
        this.prisma.team.findUnique({
          relationLoadStrategy: JOIN,
          where: { slug },
          select: {
            id: true,
            name: true,
            shortName: true,
            slug: true,
            country: true,
            founded: true,
            /* La vista lo necesita: una selección no tiene casa ni club parecido. */
            isNationalTeam: true,
            logoUrl: true,
            primaryColor: true,
            secondaryColor: true,
            /* La casa del club: un JOIN sobre un findUnique, y sirve a la página y a la home. */
            venue: {
              select: {
                id: true,
                name: true,
                city: true,
                capacity: true,
                surface: true,
                imageUrl: true,
                address: true,
              },
            },
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
        /*
         * Todas las tablas del club, no solo las de la temporada en curso. La página muestra la
         * vigente y el comparador ofrece el resto: sin esto, comparar dos clubes solo dejaba mirar
         * el año actual aunque la base tenga media década.
         */
        this.prisma.standing.findMany({
          relationLoadStrategy: JOIN,
          where: { team: { slug } },
          select: {
            position: true,
            points: true,
            played: true,
            won: true,
            drawn: true,
            lost: true,
            goalsFor: true,
            goalsAgainst: true,
            groupLabel: true,
            season: {
              select: {
                year: true,
                isCurrent: true,
                competition: { select: { name: true, slug: true, logoUrl: true } },
              },
            },
          },
          orderBy: [{ season: { year: 'desc' } }, { played: 'desc' }],
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
        /* Solo la plantilla más reciente: traer todos los años para descartarlos en memoria era pedir
           cinco temporadas de fichas para mostrar una. */
        this.prisma.squadMembership.findMany({
          relationLoadStrategy: JOIN,
          where: { team: { slug }, year: { gte: new Date().getFullYear() - 1 } },
          orderBy: [{ year: 'desc' }, { shirtNumber: 'asc' }],
          select: {
            year: true,
            shirtNumber: true,
            position: true,
            player: {
              select: { id: true, name: true, slug: true, photoUrl: true, position: true },
            },
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
        /*
         * Las alineaciones de los últimos partidos jugados. Es lo que un hincha quiere ver del equipo
         * —con qué salió— y ya estaba en la base sin que ninguna vista la mostrara fuera del partido.
         * Vienen las cinco para que la tarjeta pueda moverse entre fechas sin volver a pedir nada.
         */
        this.prisma.matchLineup.findMany({
          relationLoadStrategy: JOIN,
          where: ultimoJugado,
          orderBy: { match: { kickoffUtc: 'desc' } },
          /* De más: hay filas cáscara con el once vacío —copas que el proveedor nunca completó— y se
           descartan después, así que pedir justo cinco dejaría huecos en las flechas. */
          take: ALINEACIONES + 4,
          select: {
            teamId: true,
            formation: true,
            coachName: true,
            startXi: true,
            substitutes: true,
            match: {
              select: {
                ...matchCard,
                /* Los cambios salen del mismo select: quién entró, quién salió y en qué minuto. */
                events: {
                  where: { kind: 'substitution' },
                  /*
                   * En Postgres `asc` es `nulls last`, así que un gol al 45' —sin minuto agregado— salía
                   * **después** de uno al 45+3'. Y sin un tercer criterio, dos eventos del mismo minuto salen
                   * en orden arbitrario y pueden intercambiarse entre dos consultas, con lo que el marcador
                   * corriente del relato parpadearía. El id desempata y no cambia.
                   */
                  orderBy: [
                    { minute: 'asc' },
                    { extraMinute: { sort: 'asc', nulls: 'first' } },
                    { id: 'asc' },
                  ],
                  select: {
                    minute: true,
                    extraMinute: true,
                    team: { select: { id: true } },
                    player: playerLink,
                    relatedPlayer: playerLink,
                    detail: true,
                  },
                },
              },
            },
          },
        }),
        /*
         * Las notas de esos partidos, en la misma tanda paralela: pedirlas después de saber cuáles son
         * costaría un viaje entero a Supabase. Se piden por fecha y se agrupan por partido; con ciento
         * veinte filas entran los cinco últimos con sus suplentes.
         */
        this.prisma.matchPlayerStatistics.findMany({
          relationLoadStrategy: JOIN,
          where: ultimoJugado,
          orderBy: [{ match: { kickoffUtc: 'desc' } }],
          take: ALINEACIONES * 30,
          select: { ...matchPlayerStats, matchId: true, player: playerLink },
        }),
        /*
         * Altas y bajas del club. Son dos consultas y no un OR sobre las dos columnas justamente
         * para que cada una entre por su propio índice: medido, 0,014 ms la de altas y 0,039 la de
         * bajas, contra un mapa de bits combinado que tendría que leer las dos.
         */
        this.prisma.transfer.findMany({
          relationLoadStrategy: JOIN,
          where: { entraA: { slug }, fecha: { gte: desdeMercado } },
          orderBy: { fecha: 'desc' },
          take: MOVIMIENTOS,
          select: movimientoDeMercado,
        }),
        this.prisma.transfer.findMany({
          relationLoadStrategy: JOIN,
          where: { saleDe: { slug }, fecha: { gte: desdeMercado } },
          orderBy: { fecha: 'desc' },
          take: MOVIMIENTOS,
          select: movimientoDeMercado,
        }),
      ]);
    if (!team) throw await this.noEncontrado('team', slug, 'Equipo no encontrado');

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
        gruposVigentes(jornadaPorTorneo.get(clave) ?? null, etiquetas).map(
          (label) => `${clave}:${label}`,
        ),
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

    /*
     * Las notas se pidieron por equipo y fecha, no por partido, así que se agrupan acá. Sin notas la
     * cancha se dibuja igual: es la alineación la que manda.
     */
    const notasPorPartido = new Map<string, typeof notas>();
    for (const nota of notas) {
      notasPorPartido.set(nota.matchId, [...(notasPorPartido.get(nota.matchId) ?? []), nota]);
    }

    /*
     * El cambio se normaliza acá, y con cuidado: el proveedor pone al que **sale** en `player` y al
     * que entra en `relatedPlayer`. Se verificó contra los datos —el `player` siempre estaba en el
     * once con los minutos cortados en el minuto del cambio— porque el nombre de los campos sugiere
     * lo contrario. Un tercio de los eventos no tiene el jugador resuelto en Athena, así que el
     * nombre del proveedor viaja como respaldo.
     */
    const nombreSuelto = (detail: unknown, clave: 'playerName' | 'relatedPlayerName') => {
      const valor = (detail as Record<string, unknown> | null)?.[clave];
      return typeof valor === 'string' ? valor : null;
    };

    const lineups = alineaciones
      /* Sin once no hay cancha: las filas cáscara ensuciarían la navegación con canchas vacías. */
      .filter((a) => Array.isArray(a.startXi) && a.startXi.length > 0)
      .slice(0, ALINEACIONES)
      .map(({ match, teamId, ...resto }) => {
        const { events, ...partido } = match;
        return {
          ...resto,
          match: partido,
          stats: notasPorPartido.get(match.id) ?? [],
          substitutions: events
            .filter((e) => e.team.id === teamId)
            .map((e) => ({
              minute: e.minute,
              extraMinute: e.extraMinute,
              sale: e.player,
              saleNombre: e.player?.name ?? nombreSuelto(e.detail, 'playerName'),
              entra: e.relatedPlayer,
              entraNombre: e.relatedPlayer?.name ?? nombreSuelto(e.detail, 'relatedPlayerName'),
            })),
        };
      });

    return {
      team,
      standings: tablas,
      standingsHistory: historial,
      recent,
      upcoming,
      squad: { year: squadYear, lines: groupSquadByLine(currentSquad) },
      scorers,
      lineups,
      mercado: { altas, bajas },
    };
  }

  /*
   * Las cinco consultas van juntas, incluida la del partido. Encadenar el `findUnique` primero
   * costaba un viaje entero a Supabase —cerca de un segundo desde fuera de su región— para
   * enterarse de algo que las otras cuatro toleran: un id que no existe devuelve listas vacías.
   */
  /**
   * El partido que vive en `/partidos/{local}-vs-{visita}-{fecha}`.
   *
   * Con la fecha exacta hay un solo candidato. Si no lo hay, se busca el mismo cruce a diez días
   * para cada lado: los partidos se aplazan, y un enlace compartido antes del cambio no debería
   * morir por eso —contesta el partido bueno y la web redirige a su dirección nueva—.
   */
  async matchPorRuta(local: string, visita: string, fecha: string) {
    const [equipoLocal, equipoVisita] = await Promise.all([
      this.prisma.team.findUnique({ where: { slug: local }, select: { id: true } }),
      this.prisma.team.findUnique({ where: { slug: visita }, select: { id: true } }),
    ]);
    if (!equipoLocal || !equipoVisita) throw new NotFoundException('Partido no encontrado');

    /* Lima es UTC-5 todo el año: el día local va de las 05:00 UTC a las 05:00 del siguiente. */
    const inicioDelDia = new Date(`${fecha}T05:00:00.000Z`);
    if (Number.isNaN(inicioDelDia.getTime())) throw new NotFoundException('Partido no encontrado');
    const DIA = 86_400_000;
    const MARGEN = 10 * DIA;

    const candidatos = await this.prisma.match.findMany({
      where: {
        homeTeamId: equipoLocal.id,
        awayTeamId: equipoVisita.id,
        kickoffUtc: {
          gte: new Date(inicioDelDia.getTime() - MARGEN),
          lt: new Date(inicioDelDia.getTime() + DIA + MARGEN),
        },
      },
      select: { id: true, kickoffUtc: true },
      orderBy: { kickoffUtc: 'asc' },
    });
    if (candidatos.length === 0) throw new NotFoundException('Partido no encontrado');

    const finDelDia = inicioDelDia.getTime() + DIA;
    const exacto = candidatos.find(
      (c) => c.kickoffUtc.getTime() >= inicioDelDia.getTime() && c.kickoffUtc.getTime() < finDelDia,
    );
    if (exacto) return { id: exacto.id, exacta: true, fecha };

    const cercano = candidatos.reduce((mejor, c) =>
      Math.abs(c.kickoffUtc.getTime() - inicioDelDia.getTime()) <
      Math.abs(mejor.kickoffUtc.getTime() - inicioDelDia.getTime())
        ? c
        : mejor,
    );
    return {
      id: cercano.id,
      exacta: false,
      fecha: new Date(cercano.kickoffUtc.getTime() - 5 * 3_600_000).toISOString().slice(0, 10),
    };
  }

  async match(id: string) {
    const [match, insights, statistics, lineups, playerStatistics, historial, sync] =
      await Promise.all([
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
        this.prisma.matchSync.findUnique({ where: { matchId: id } }),
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
      /* Qué le falta al partido: la pantalla distingue "todavía no llegó" de "no va a llegar". */
      sync: sync && {
        completo: Boolean(
          sync.eventosCompleto &&
            sync.alineacionesCompleto &&
            sync.estadisticasCompleto &&
            sync.jugadoresCompleto,
        ),
        cerrado: sync.cerradoEn !== null,
        alineaciones: sync.alineacionesCompleto,
        estadisticas: sync.estadisticasCompleto,
        jugadores: sync.jugadoresCompleto,
      },
    };
  }

  async player(slug: string) {
    /*
     * Antes eran cuatro viajes en fila —jugador, relaciones, equipos y el resto— y desde fuera de
     * la región de Supabase cada uno cuesta cerca de un segundo. Ahora todo lo que se puede pedir
     * por slug va junto; los equipos son el único paso que necesita el resultado anterior.
     */
    const [player, teams, events, seasons, recentPerformances, squad, trofeos, escudos, fichajes] =
      await Promise.all([
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
              /* El slug arma la dirección del partido; el escudo evita una fila de puro texto. */
              homeTeam: { select: { name: true, slug: true, logoUrl: true } },
              awayTeam: { select: { name: true, slug: true, logoUrl: true } },
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
      /*
       * El palmarés y los pases viajan en la misma tanda que el resto de la ficha: pedirlos después
       * sumaría dos idas y vueltas a una vista que ya tiene ocho.
       */
      this.prisma.playerTrophy.findMany({
        where: { player: { slug } },
        orderBy: [{ temporada: 'desc' }, { competencia: 'asc' }],
        select: { competencia: true, pais: true, temporada: true, puesto: true },
      }),
      /*
       * Las competencias con escudo, para ponerle uno a cada título. Son 77 filas y se piden
       * enteras una sola vez: cruzarlas en memoria sale más barato que un LEFT JOIN por nombre, y
       * además deja aplicar la tabla de alias, que en SQL sería un CASE de seis ramas.
       */
      this.prisma.competition.findMany({
        where: { logoUrl: { not: null } },
        select: { name: true, slug: true, logoUrl: true },
      }),
      this.prisma.transfer.findMany({
        relationLoadStrategy: JOIN,
        where: { player: { slug } },
        orderBy: { fecha: 'desc' },
        take: 20,
        select: {
          fecha: true,
          clase: true,
          monto: true,
          entraANombre: true,
          saleDeNombre: true,
          entraA: { select: { slug: true, logoUrl: true } },
          saleDe: { select: { slug: true, logoUrl: true } },
        },
      }),
    ]);
    if (!player) throw await this.noEncontrado('player', slug, 'Jugador no encontrado');

    /*
     * A cada título, el escudo de su torneo. El nombre pasa por la tabla de alias porque el
     * endpoint de trofeos no usa los mismos nombres que el de competencias del mismo proveedor:
     * escribe "CONMEBOL Copa America" donde en las competencias pone "Copa América".
     */
    const porNombre = new Map(escudos.map((c) => [normalizarNombre(c.name), c]));
    const palmares = trofeos.map((t) => {
      const torneo = porNombre.get(normalizarNombre(torneoDeTrofeo(t.competencia)));
      return { ...t, logoUrl: torneo?.logoUrl ?? null, slug: torneo?.slug ?? null };
    });

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
      palmares,
      fichajes,
    };
  }

  /**
   * Lo que va al sitemap, por tipo y paginado.
   *
   * Criterio, no catálogo: de 4.732 equipos solo 1.023 tienen tabla de posiciones y de 46.350
   * jugadores solo 27.908 tienen una estadística. Listar los otros es pedirle al buscador que juzgue
   * dieciocho mil páginas sin un dato, y lo que hace con eso es bajarle el promedio al resto.
   */
  async sitemapEntries(tipo: string, pagina: number) {
    const TAMANO = 20_000;
    const saltar = pagina * TAMANO;

    if (tipo === 'competencias') {
      const filas = await this.prisma.competition.findMany({
        where: { isActive: true },
        select: { slug: true, updatedAt: true },
        orderBy: { slug: 'asc' },
        skip: saltar,
        take: TAMANO,
      });
      return filas.map((f) => ({ ruta: `/competencias/${f.slug}`, lastmod: f.updatedAt }));
    }

    if (tipo === 'equipos') {
      const filas = await this.prisma.team.findMany({
        where: { standings: { some: {} } },
        select: { slug: true, updatedAt: true },
        orderBy: { slug: 'asc' },
        skip: saltar,
        take: TAMANO,
      });
      return filas.map((f) => ({ ruta: `/equipos/${f.slug}`, lastmod: f.updatedAt }));
    }

    if (tipo === 'jugadores') {
      const filas = await this.prisma.player.findMany({
        where: { seasonStatistics: { some: {} } },
        select: { slug: true, updatedAt: true },
        orderBy: { slug: 'asc' },
        skip: saltar,
        take: TAMANO,
      });
      return filas.map((f) => ({ ruta: `/jugadores/${f.slug}`, lastmod: f.updatedAt }));
    }

    if (tipo === 'partidos') {
      /* El año pasado y lo que viene: un partido de 2019 ya no le interesa a nadie que busque hoy. */
      const desde = new Date(Date.now() - 365 * 86_400_000);
      const filas = await this.prisma.match.findMany({
        where: { kickoffUtc: { gte: desde } },
        select: {
          kickoffUtc: true,
          updatedAt: true,
          homeTeam: { select: { slug: true } },
          awayTeam: { select: { slug: true } },
        },
        orderBy: { kickoffUtc: 'desc' },
        skip: saltar,
        take: TAMANO,
      });
      return filas.map((f) => ({
        ruta: `/partidos/${f.homeTeam.slug}-vs-${f.awayTeam.slug}-${enLima(f.kickoffUtc)}`,
        lastmod: f.updatedAt,
      }));
    }

    return [];
  }
}

/*
 * Cuántos minutos hay que jugar para entrar al podio del día. Veinte y no cuarenta y cinco: el que
 * entra a los sesenta y hace dos es justo la historia que este bloque quiere contar.
 */
const MINUTOS_PARA_DESTACAR = 20;

/*
 * Cómo se ordena el podio del día: goles por dos, la asistencia una, y la nota decide los empates.
 * La fórmula vive en el SQL de `performersOn` porque ordenar en memoria obligaba a traer un lote
 * recortado por otra cosa, y ahí se perdía justamente al que hizo los goles.
 */

/* Lima es UTC-5 todo el año: la fecha local de un instante es la del instante menos cinco horas. */
const enLima = (fecha: Date) =>
  new Date(fecha.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);


/** Cómo le fue a cada uno jugando en su cancha, sobre toda la historia. */
export interface SedeHistorial {
  jugados: number;
  gano: number;
  empato: number;
}

export interface ResumenHistorial {
  jugados: number;
  gano_local: number;
  empates: number;
  gano_visita: number;
  goles_local: number;
  goles_visita: number;
  /** El primer cruce de la historia: una cifra sin su desde no dice de cuándo habla. */
  desde_utc: Date;
  /** El local de hoy, jugando en su cancha. */
  casa_local: SedeHistorial;
  /** El visitante de hoy, jugando en la suya. */
  casa_visita: SedeHistorial;
}

/** Cada fila del SQL repite el resumen, con las sumas planas tal como las devuelve Postgres. */
export interface FilaHistorial extends CruceHistorial {
  jugados: number;
  gano_local: number;
  empates: number;
  gano_visita: number;
  goles_local: number;
  goles_visita: number;
  desde_utc: Date;
  casa_local_jugados: number;
  casa_local_gano: number;
  casa_local_empato: number;
  casa_visita_jugados: number;
  casa_visita_gano: number;
  casa_visita_empato: number;
}

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
  competition_logo: string | null;
  season_year: number;
  /** La ronda como la nombra el proveedor; la web la traduce. */
  round: string | null;
}

export interface Historial {
  resumen: ResumenHistorial | null;
  ultimos: CruceHistorial[];
}

/* Lo mínimo que necesita un cuadro: quién, cuándo y cómo terminó. */
export interface FilaOnceTorneo {
  position: string;
  rating: string | null;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  player_id: string;
  player_name: string;
  player_slug: string;
  photo_url: string | null;
  team_name: string;
  team_short: string | null;
  team_slug: string;
  team_logo: string | null;
}

export interface OnceDelTorneo {
  players: FilaOnceTorneo[];
  best: FilaOnceTorneo | null;
}

export interface PartidoDeCuadro {
  id: string;
  kickoffUtc: Date;
  status: string;
  statusDetail: string | null;
  elapsedMinutes: number | null;
  homeScore: number | null;
  awayScore: number | null;
  round: string | null;
  homeTeam: {
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    logoUrl: string | null;
  };
  awayTeam: {
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    logoUrl: string | null;
  };
}

export type EstadoDeTemporada = 'en-juego' | 'terminado' | 'por-empezar';

export interface RondaDePartidos {
  label: string;
  enJuego: boolean;
  partidos: PartidoDeCuadro[];
  /** En qué se parte la ronda —ida y vuelta, grupo por grupo—; vacío si no hay nada que separar. */
  bloques: Array<{ titulo: string; partidos: PartidoDeCuadro[] }>;
}

export interface RondaDeCuadro {
  round: string;
  label: string;
  /** Cierto solo en la ronda que el calendario tiene en curso, y nunca en un torneo terminado. */
  enJuego: boolean;
  /** Cuántas llaves va a tener cuando se defina; solo en las rondas que todavía no se sortearon. */
  porDefinir?: number;
  ties: Array<{
    homeTeam: PartidoDeCuadro['homeTeam'];
    awayTeam: PartidoDeCuadro['awayTeam'];
    legs: PartidoDeCuadro[];
    aggregate: { local: number; visita: number } | null;
    advancedTeamId: string | null;
  }>;
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
  const byCompetition = new Map<
    string,
    { competition: T['season']['competition']; matches: T[] }
  >();
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
function groupSquadByLine<T extends SquadRow>(
  rows: T[],
): Array<{ line: string; label: string; players: T[] }> {
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
