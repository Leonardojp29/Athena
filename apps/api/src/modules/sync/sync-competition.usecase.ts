import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@athena/database';
import { slugify, type FootballDataProvider, type ProviderCoverage } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { CONFIGURED_COMPETITIONS } from './competitions.config.js';
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

    /*
     * El continente lo decide el catálogo y no el proveedor: es una decisión de producto —dónde
     * queremos que aparezca cada torneo— y no un dato del fútbol. El código de país sí es del
     * proveedor, y el catálogo lo cubre para las copas internacionales, que no tienen país.
     */
    const catalogo = CONFIGURED_COMPETITIONS.find((c) => c.providerRef === competitionRef);
    const geo = {
      countryCode: data.countryCode ?? catalogo?.countryCode ?? null,
      flagUrl: data.flagUrl,
      continent: catalogo?.continent ?? null,
      /* De clubes o de selecciones: el proveedor no distingue un Mundial de una Champions. */
      scope: catalogo?.scope ?? 'clubs',
    };

    /*
     * El nombre del catálogo gana cuando existe: el proveedor manda "World Cup" y "Euro Championship"
     * y esto se lee en español. Solo lo llevan los torneos donde el nombre del proveedor no sirve.
     */
    const name = catalogo?.nombre ?? data.name;

    const competition = existingId
      ? await this.prisma.competition.update({
          where: { id: existingId },
          data: {
            name,
            country: data.country,
            format: data.format,
            logoUrl: data.logoUrl,
            ...geo,
          },
        })
      : await this.prisma.competition.create({
          data: {
            name,
            slug: await this.uniqueSlug({ name, country: data.country }),
            country: data.country,
            format: data.format,
            logoUrl: data.logoUrl,
            isActive: true,
            ...geo,
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
          cobertura: coberturaJson(season.cobertura),
        },
        create: {
          competitionId: competition.id,
          year: season.year,
          startDate: season.startDate ? new Date(season.startDate) : null,
          endDate: season.endDate ? new Date(season.endDate) : null,
          isCurrent: season.isCurrent,
          cobertura: coberturaJson(season.cobertura),
        },
      });
    }

    this.logger.log(`Synced ${name} (${data.seasons.length} seasons)`);
    return competition.id;
  }

  private async uniqueSlug(data: { name: string; country: string | null }): Promise<string> {
    const base = slugify(data.name);
    const taken = await this.prisma.competition.findUnique({ where: { slug: base } });
    return taken ? slugify(`${data.name} ${data.country ?? ''}`) : base;
  }
}

function coberturaJson(cobertura: ProviderCoverage | null): Prisma.InputJsonValue | undefined {
  return cobertura ? { ...cobertura } : undefined;
}
