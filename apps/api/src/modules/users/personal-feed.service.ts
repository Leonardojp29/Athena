import { Injectable } from '@nestjs/common';
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
export class PersonalFeedService {
  constructor(private readonly prisma: PrismaService) {}

  /** Partidos y análisis de lo que el usuario sigue. Vacío si no sigue nada. */
  async build(userId: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { entityType: true, entityId: true },
    });
    if (favorites.length === 0) {
      return { hasFavorites: false, live: [], upcoming: [], recent: [], insights: [] };
    }

    const teamIds = favorites.filter((f) => f.entityType === 'team').map((f) => f.entityId);
    const competitionIds = favorites
      .filter((f) => f.entityType === 'competition')
      .map((f) => f.entityId);

    const matchFilter = {
      OR: [
        ...(teamIds.length
          ? [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }]
          : []),
        ...(competitionIds.length ? [{ season: { competitionId: { in: competitionIds } } }] : []),
      ],
    };
    if (matchFilter.OR.length === 0) {
      return { hasFavorites: true, live: [], upcoming: [], recent: [], insights: [] };
    }

    const [live, upcoming, recent] = await Promise.all([
      this.prisma.match.findMany({
        where: { ...matchFilter, status: { in: ['in_play', 'paused'] } },
        select: matchCard,
        orderBy: { kickoffUtc: 'asc' },
        take: 20,
      }),
      this.prisma.match.findMany({
        where: { ...matchFilter, status: 'scheduled', kickoffUtc: { gte: new Date() } },
        select: matchCard,
        orderBy: { kickoffUtc: 'asc' },
        take: 10,
      }),
      this.prisma.match.findMany({
        where: { ...matchFilter, status: 'finished' },
        select: matchCard,
        orderBy: { kickoffUtc: 'desc' },
        take: 10,
      }),
    ]);

    const insights = await this.prisma.insight.findMany({
      where: {
        subjectType: 'match',
        subjectId: { in: recent.map((m) => m.id) },
        kind: 'post_match_analysis',
      },
      orderBy: { generatedAt: 'desc' },
      take: 5,
      select: { subjectId: true, narrative: true },
    });

    return {
      hasFavorites: true,
      live,
      upcoming,
      recent,
      insights: insights.map((row) => ({
        matchId: row.subjectId,
        ...(JSON.parse(row.narrative) as { titular: string }),
      })),
    };
  }
}
