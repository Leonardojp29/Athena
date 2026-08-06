import { Inject, Injectable, Logger } from '@nestjs/common';
import { slugify, type FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

@Injectable()
export class SyncCompetitionUseCase {
  private readonly logger = new Logger(SyncCompetitionUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(competitionRef: string): Promise<string> {
    const result = await this.provider.getCompetition(competitionRef);
    if (!result) throw new Error(`Competition not found in provider: ${competitionRef}`);

    const { data } = result;
    const existingId = await this.refs.resolve(this.provider.name, 'competition', competitionRef);

    const competition = existingId
      ? await this.prisma.competition.update({
          where: { id: existingId },
          data: {
            name: data.name,
            country: data.country,
            format: data.format,
            logoUrl: data.logoUrl,
          },
        })
      : await this.prisma.competition.create({
          data: {
            name: data.name,
            slug: await this.uniqueSlug(data),
            country: data.country,
            format: data.format,
            logoUrl: data.logoUrl,
            isActive: true,
          },
        });

    if (!existingId) {
      await this.refs.link(this.provider.name, 'competition', competitionRef, competition.id);
    }

    for (const season of data.seasons) {
      await this.prisma.season.upsert({
        where: { competitionId_year: { competitionId: competition.id, year: season.year } },
        update: {
          startDate: season.startDate ? new Date(season.startDate) : null,
          endDate: season.endDate ? new Date(season.endDate) : null,
          isCurrent: season.isCurrent,
        },
        create: {
          competitionId: competition.id,
          year: season.year,
          startDate: season.startDate ? new Date(season.startDate) : null,
          endDate: season.endDate ? new Date(season.endDate) : null,
          isCurrent: season.isCurrent,
        },
      });
    }

    this.logger.log(`Synced ${data.name} (${data.seasons.length} seasons)`);
    return competition.id;
  }

  private async uniqueSlug(data: { name: string; country: string | null }): Promise<string> {
    const base = slugify(data.name);
    const taken = await this.prisma.competition.findUnique({ where: { slug: base } });
    return taken ? slugify(`${data.name} ${data.country ?? ''}`) : base;
  }
}
