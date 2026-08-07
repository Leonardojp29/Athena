import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';
import {
  CONTINENT_LABEL,
  CONTINENT_ORDER,
  competitionRank,
  countryRank,
  type Continent,
} from './regions.js';

const teamSummary = {
  select: { id: true, name: true, shortName: true, slug: true, logoUrl: true },
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

    return CONTINENT_ORDER.filter((c) => porContinente.has(c)).map((continent) => {
      const paises = porContinente.get(continent) as Map<string, typeof rows>;
      return {
        continent,
        label: CONTINENT_LABEL[continent],
        countries: [...paises.entries()]
          .map(([code, competitions]) => ({
            code: code === '' ? null : code,
            /*
             * Sin código no hay país, y el nombre tiene que ser null: heredar el `country` de
             * la primera fila hacía que el grupo internacional se llamara "Germany".
             */
            name: code === '' ? null : (competitions[0]?.country ?? null),
            flagUrl: code === '' ? null : (competitions[0]?.flagUrl ?? null),
            competitions: [...competitions].sort(
              (a, b) =>
                competitionRank(a.format, a.name) - competitionRank(b.format, b.name) ||
                a.name.localeCompare(b.name, 'es'),
            ),
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
  async topPerformers(date: string, limite = 6) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Fecha inválida');

    /*
     * A media mañana ningún partido del día terminó todavía y el podio quedaría vacío. Se cae
     * al día anterior y se devuelve la fecha usada, para que la interfaz pueda decir de cuándo
     * es lo que muestra en lugar de dejar un hueco.
     */
    for (const offset of [0, -1, -2]) {
      const dia = new Date(new Date(`${date}T12:00:00${LIMA_OFFSET}`).getTime() + offset * DAY_MS);
      const iso = dia.toISOString().slice(0, 10);
      const players = await this.performersOn(iso, limite);
      if (players.length > 0) return { date: iso, esDeHoy: offset === 0, players };
    }
    return { date, esDeHoy: true, players: [] };
  }

  private async performersOn(date: string, limite: number) {
    const start = new Date(`${date}T00:00:00${LIMA_OFFSET}`);

    return this.prisma.matchPlayerStatistics.findMany({
      where: {
        rating: { not: null },
        minutesPlayed: { gte: 45 },
        match: {
          status: 'finished',
          kickoffUtc: { gte: start, lt: new Date(start.getTime() + DAY_MS) },
        },
      },
      orderBy: [{ rating: 'desc' }, { minutesPlayed: 'desc' }],
      take: limite,
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
            season: { select: { competition: { select: { name: true, slug: true } } } },
          },
        },
      },
    });
  }

  /** El índice de partidos: un día calendario de Lima, agrupado por competencia. */
  async matchesOnDate(date: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new BadRequestException('Fecha inválida');
    const start = new Date(`${date}T00:00:00${LIMA_OFFSET}`);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('Fecha inválida');

    const matches = await this.prisma.match.findMany({
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

  async competition(slug: string) {
    const competition = await this.prisma.competition.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, country: true, format: true, logoUrl: true },
    });
    if (!competition) throw new NotFoundException('Competencia no encontrada');

    const season = await this.prisma.season.findFirst({
      where: { competitionId: competition.id, isCurrent: true },
      orderBy: { year: 'desc' },
      select: { id: true, year: true },
    });
    if (!season) throw new NotFoundException('Sin temporada activa');

    const [standings, recent, upcoming] = await Promise.all([
      this.prisma.standing.findMany({
        where: { seasonId: season.id },
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
        where: { seasonId: season.id, status: 'finished' },
        select: matchCard,
        orderBy: { kickoffUtc: 'desc' },
        take: 10,
      }),
      this.prisma.match.findMany({
        where: {
          seasonId: season.id,
          status: { in: ['scheduled', 'in_play', 'paused'] },
          kickoffUtc: { gte: new Date(Date.now() - 3 * 3600_000) },
        },
        select: matchCard,
        orderBy: { kickoffUtc: 'asc' },
        take: 10,
      }),
    ]);

    const groups = new Map<string, typeof standings>();
    for (const row of standings) {
      if (!groups.has(row.groupLabel)) groups.set(row.groupLabel, []);
      groups.get(row.groupLabel)?.push(row);
    }

    return {
      competition,
      season: { year: season.year },
      standingGroups: [...groups.entries()].map(([label, rows]) => ({ label, rows })),
      recent,
      upcoming,
    };
  }

  async team(slug: string) {
    const team = await this.prisma.team.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        shortName: true,
        slug: true,
        country: true,
        founded: true,
        logoUrl: true,
      },
    });
    if (!team) throw new NotFoundException('Equipo no encontrado');

    const [standings, recent, upcoming, squad] = await Promise.all([
      this.prisma.standing.findMany({
        where: { teamId: team.id, season: { isCurrent: true } },
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
        where: { status: 'finished', OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }] },
        select: matchCard,
        orderBy: { kickoffUtc: 'desc' },
        take: 10,
      }),
      this.prisma.match.findMany({
        where: {
          status: { in: ['scheduled', 'in_play', 'paused'] },
          kickoffUtc: { gte: new Date(Date.now() - 3 * 3600_000) },
          OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
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
        where: { teamId: team.id },
        orderBy: [{ year: 'desc' }, { shirtNumber: 'asc' }],
        select: {
          year: true,
          shirtNumber: true,
          position: true,
          player: { select: { id: true, name: true, slug: true, photoUrl: true, position: true } },
        },
      }),
    ]);

    const squadYear = squad[0]?.year ?? null;
    const currentSquad = squad.filter((row) => row.year === squadYear);

    return {
      team,
      standings,
      recent,
      upcoming,
      squad: { year: squadYear, lines: groupSquadByLine(currentSquad) },
    };
  }

  async match(id: string) {
    const match = await this.prisma.match.findUnique({
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
    });
    if (!match) throw new NotFoundException('Partido no encontrado');

    const [insights, statistics, lineups, playerStatistics] = await Promise.all([
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
        where: { matchId: id },
        orderBy: [{ isStarter: 'desc' }, { minutesPlayed: 'desc' }],
        select: { ...matchPlayerStats, player: playerLink },
      }),
    ]);

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
    };
  }

  async player(slug: string) {
    const player = await this.prisma.player.findUnique({
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
    });
    if (!player) throw new NotFoundException('Jugador no encontrado');

    const relationships = await this.prisma.entityRelationship.findMany({
      where: { fromType: 'player', fromId: player.id, relation: 'played_for' },
      select: { toId: true },
    });
    const teams = await this.prisma.team.findMany({
      where: { id: { in: relationships.map((r) => r.toId) } },
      select: { id: true, name: true, slug: true, logoUrl: true, country: true },
    });

    const [events, seasons, recentPerformances, squad] = await Promise.all([
      this.prisma.matchEvent.findMany({
        where: { playerId: player.id },
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
        where: { playerId: player.id },
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
        where: { playerId: player.id },
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
        where: { playerId: player.id },
        orderBy: { year: 'desc' },
        take: 4,
        select: { year: true, shirtNumber: true, team: teamSummary },
      }),
    ]);

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
