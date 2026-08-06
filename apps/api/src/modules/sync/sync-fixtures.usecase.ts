import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider, ProviderMatch, ProviderRef } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { DomainEventPublisher } from './domain-event.publisher.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { MatchEventWriter } from './match-event.writer.js';

@Injectable()
export class SyncFixturesUseCase {
  private readonly logger = new Logger(SyncFixturesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    private readonly events: DomainEventPublisher,
    private readonly eventWriter: MatchEventWriter,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(competitionRef: string, seasonYear: number): Promise<number> {
    const fixtures = await this.provider.getMatches(competitionRef, seasonYear);
    return this.upsertMany(fixtures);
  }

  async syncLive(): Promise<number> {
    const live = await this.provider.getLiveMatches();
    // live=all trae todas las ligas del mundo: las no cubiertas se descartan sin warning
    const count = await this.upsertMany(
      live.map((l) => l.match),
      { quiet: true },
    );

    const withEvents = live.filter((l) => l.events.length > 0);
    if (withEvents.length > 0) {
      const ids = await this.refs.resolveMany(
        this.provider.name,
        'match',
        withEvents.map((l) => l.match.providerRef),
      );
      for (const item of withEvents) {
        const id = ids.get(item.match.providerRef);
        if (id) await this.eventWriter.replace(this.provider.name, id, item.events);
      }
    }
    return count;
  }

  private async upsertMany(
    fixtures: ProviderRef<ProviderMatch>[],
    opts: { quiet?: boolean } = {},
  ): Promise<number> {
    if (fixtures.length === 0) return 0;

    const teamRefs = [
      ...new Set(fixtures.flatMap((f) => [f.data.homeTeamRef, f.data.awayTeamRef])),
    ];
    const teams = await this.refs.resolveMany(this.provider.name, 'team', teamRefs);
    const matchIds = await this.refs.resolveMany(
      this.provider.name,
      'match',
      fixtures.map((f) => f.providerRef),
    );
    const seasons = await this.resolveSeasons(fixtures);

    const resolvable = fixtures.filter((f) => {
      const ok =
        seasons.has(`${f.data.competitionRef}:${f.data.seasonYear}`) &&
        teams.has(f.data.homeTeamRef) &&
        teams.has(f.data.awayTeamRef);
      if (!ok && !opts.quiet)
        this.logger.warn(`Skipping fixture ${f.providerRef}: unresolved season/team refs`);
      return ok;
    });

    const toFields = ({ data }: ProviderRef<ProviderMatch>) => ({
      seasonId: seasons.get(`${data.competitionRef}:${data.seasonYear}`) as string,
      round: data.round,
      homeTeamId: teams.get(data.homeTeamRef) as string,
      awayTeamId: teams.get(data.awayTeamRef) as string,
      kickoffUtc: new Date(data.kickoffUtc),
      status: data.status,
      statusDetail: data.statusDetail,
      elapsedMinutes: data.elapsedMinutes,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
    });

    const fresh = resolvable.filter((f) => !matchIds.has(f.providerRef));
    if (fresh.length > 0) {
      const created = await this.prisma.match.createManyAndReturn({
        data: fresh.map(toFields),
        select: { id: true },
      });
      await this.prisma.externalReference.createMany({
        data: created.map((match, i) => ({
          provider: this.provider.name,
          entityType: 'match',
          providerRef: fresh[i]?.providerRef as string,
          entityId: match.id,
        })),
      });
    }

    const existing = resolvable.filter((f) => matchIds.has(f.providerRef));
    let updated = 0;
    if (existing.length > 0) {
      const current = await this.prisma.match.findMany({
        where: { id: { in: existing.map((f) => matchIds.get(f.providerRef) as string) } },
        select: {
          id: true,
          status: true,
          homeScore: true,
          awayScore: true,
          elapsedMinutes: true,
          statusDetail: true,
          kickoffUtc: true,
        },
      });
      const currentById = new Map(current.map((m) => [m.id, m]));

      for (const fixture of existing) {
        const id = matchIds.get(fixture.providerRef) as string;
        const prev = currentById.get(id);
        const fields = toFields(fixture);
        const changed =
          !prev ||
          prev.status !== fields.status ||
          prev.statusDetail !== fields.statusDetail ||
          prev.homeScore !== fields.homeScore ||
          prev.awayScore !== fields.awayScore ||
          prev.elapsedMinutes !== fields.elapsedMinutes ||
          prev.kickoffUtc.getTime() !== fields.kickoffUtc.getTime();
        if (!changed) continue;

        await this.prisma.match.update({ where: { id }, data: fields });
        updated++;
        if (prev && prev.status !== 'finished' && fields.status === 'finished') {
          await this.events.publish('MATCH_FINISHED', 'match', id, {
            homeScore: fields.homeScore,
            awayScore: fields.awayScore,
            providerRef: fixture.providerRef,
          });
        }
      }
    }

    this.logger.log(
      `Fixtures: ${fresh.length} created, ${updated} updated, ${fixtures.length - resolvable.length} skipped`,
    );
    return resolvable.length;
  }

  private async resolveSeasons(
    fixtures: ProviderRef<ProviderMatch>[],
  ): Promise<Map<string, string>> {
    const pairs = [
      ...new Set(fixtures.map((f) => `${f.data.competitionRef}:${f.data.seasonYear}`)),
    ];
    const result = new Map<string, string>();
    for (const pair of pairs) {
      const [competitionRef, year] = pair.split(':');
      if (!competitionRef || !year) continue;
      const competitionId = await this.refs.resolve(
        this.provider.name,
        'competition',
        competitionRef,
      );
      if (!competitionId) continue;
      const season = await this.prisma.season.findUnique({
        where: { competitionId_year: { competitionId, year: Number(year) } },
        select: { id: true },
      });
      if (season) result.set(pair, season.id);
    }
    return result;
  }
}
