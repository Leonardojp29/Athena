import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

@Injectable()
export class SyncStandingsUseCase {
  private readonly logger = new Logger(SyncStandingsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(competitionRef: string, seasonYear: number): Promise<number> {
    const rows = await this.provider.getStandings(competitionRef, seasonYear);
    if (rows.length === 0) {
      this.logger.log(`No standings for ${competitionRef}/${seasonYear}`);
      return 0;
    }

    const competitionId = await this.refs.resolve(
      this.provider.name,
      'competition',
      competitionRef,
    );
    if (!competitionId) throw new Error(`Competition not synced: ${competitionRef}`);
    const season = await this.prisma.season.findUnique({
      where: { competitionId_year: { competitionId, year: seasonYear } },
      select: { id: true },
    });
    if (!season) throw new Error(`Season not synced: ${competitionRef}/${seasonYear}`);

    const teams = await this.refs.resolveMany(
      this.provider.name,
      'team',
      rows.map((r) => r.teamRef),
    );
    const resolvable = rows.filter((r) => teams.has(r.teamRef));

    await this.prisma.$transaction([
      this.prisma.standing.deleteMany({ where: { seasonId: season.id } }),
      this.prisma.standing.createMany({
        data: resolvable.map((r) => ({
          seasonId: season.id,
          teamId: teams.get(r.teamRef) as string,
          groupLabel: r.groupLabel,
          position: r.position,
          points: r.points,
          played: r.played,
          won: r.won,
          drawn: r.drawn,
          lost: r.lost,
          goalsFor: r.goalsFor,
          goalsAgainst: r.goalsAgainst,
          form: r.form,
        })),
      }),
    ]);

    this.logger.log(`Standings ${competitionRef}/${seasonYear}: ${resolvable.length} rows`);
    return resolvable.length;
  }
}
