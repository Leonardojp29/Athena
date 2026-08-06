import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';
import { regionOf, type Region } from './regions.js';

const teamSummary = {
  select: { id: true, name: true, shortName: true, slug: true, logoUrl: true },
};

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
      competition: { select: { id: true, name: true, slug: true, logoUrl: true } },
    },
  },
} as const;

/* Perú no tiene horario de verano: el desplazamiento fijo es correcto para siempre. */
const LIMA_OFFSET = '-05:00';
const DAY_MS = 86_400_000;

@Injectable()
export class ViewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Alimenta la navegación: la lista de competencias no puede seguir cableada en el header. */
  async competitions() {
    const rows = await this.prisma.competition.findMany({
      where: { isActive: true },
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, slug: true, country: true, format: true, logoUrl: true },
    });
    return rows.map((row) => ({
      ...row,
      region: regionOf(row.country, row.format) satisfies Region,
    }));
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
    };
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

    const [standings, recent, upcoming] = await Promise.all([
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
    ]);

    return { team, standings, recent, upcoming };
  }

  async match(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      select: {
        ...matchCard,
        events: {
          orderBy: [{ minute: 'asc' }, { extraMinute: 'asc' }],
          select: {
            id: true,
            kind: true,
            minute: true,
            extraMinute: true,
            detail: true,
            team: { select: { id: true } },
            player: { select: { name: true } },
            relatedPlayer: { select: { name: true } },
          },
        },
      },
    });
    if (!match) throw new NotFoundException('Partido no encontrado');

    const [insights, statistics, lineups] = await Promise.all([
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

    const events = await this.prisma.matchEvent.findMany({
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
    });

    return { player, teams, events };
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
