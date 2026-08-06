import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';

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

@Injectable()
export class ViewsService {
  constructor(private readonly prisma: PrismaService) {}

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

    const byCompetition = new Map<
      string,
      { competition: (typeof matches)[number]['season']['competition']; matches: typeof matches }
    >();
    for (const match of matches) {
      const key = match.season.competition.id;
      if (!byCompetition.has(key)) {
        byCompetition.set(key, { competition: match.season.competition, matches: [] });
      }
      byCompetition.get(key)?.matches.push(match);
    }
    return {
      live: matches.filter((m) => m.status === 'in_play' || m.status === 'paused').length,
      sections: [...byCompetition.values()],
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
    return match;
  }

  async sitemapEntries() {
    const [competitions, teams] = await Promise.all([
      this.prisma.competition.findMany({ where: { isActive: true }, select: { slug: true } }),
      this.prisma.team.findMany({ select: { slug: true, updatedAt: true } }),
    ]);
    return { competitions, teams };
  }
}
