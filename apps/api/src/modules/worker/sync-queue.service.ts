import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Queue, Worker, type Job } from 'bullmq';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../shared/prisma.service.js';
import { REDIS } from '../../shared/redis.provider.js';
import { CONFIGURED_COMPETITIONS } from '../sync/competitions.config.js';
import { SyncCompetitionUseCase } from '../sync/sync-competition.usecase.js';
import { SyncFixturesUseCase } from '../sync/sync-fixtures.usecase.js';
import { SyncStandingsUseCase } from '../sync/sync-standings.usecase.js';
import { SyncTeamsUseCase } from '../sync/sync-teams.usecase.js';

const QUEUE = 'sync';

type SyncJob =
  | { name: 'competition'; data: { competitionRef: string } }
  | { name: 'teams'; data: { competitionRef: string; seasonYear: number } }
  | { name: 'fixtures'; data: { competitionRef: string; seasonYear: number } }
  | { name: 'standings'; data: { competitionRef: string; seasonYear: number } }
  | { name: 'live-tick'; data: Record<string, never> }
  | { name: 'daily-refresh'; data: Record<string, never> };

@Injectable()
export class SyncQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SyncQueueService.name);
  private queue!: Queue;
  private worker!: Worker;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly prisma: PrismaService,
    private readonly syncCompetition: SyncCompetitionUseCase,
    private readonly syncTeams: SyncTeamsUseCase,
    private readonly syncFixtures: SyncFixturesUseCase,
    private readonly syncStandings: SyncStandingsUseCase,
  ) {}

  async onModuleInit(): Promise<void> {
    const connection = this.redis;
    this.queue = new Queue(QUEUE, { connection });
    this.worker = new Worker(QUEUE, (job) => this.process(job as Job & SyncJob), {
      connection,
      concurrency: 4,
    });
    this.worker.on('failed', (job, err) => {
      this.logger.error(`${job?.name}#${job?.id} failed: ${err.message}`);
    });

    await this.queue.upsertJobScheduler('live-tick', { every: 60_000 }, { name: 'live-tick' });
    await this.queue.upsertJobScheduler(
      'daily-refresh',
      { pattern: '0 5 * * *', tz: 'UTC' },
      { name: 'daily-refresh' },
    );
    this.logger.log('Sync queue ready (live-tick 60s, daily-refresh 05:00 UTC)');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  async enqueue<T extends SyncJob>(
    name: T['name'],
    data: T['data'],
    opts?: { attempts?: number },
  ): Promise<void> {
    await this.queue.add(name, data, {
      attempts: opts?.attempts ?? 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    });
  }

  private async process(job: Job & SyncJob): Promise<unknown> {
    switch (job.name) {
      case 'competition':
        return this.syncCompetition.execute(job.data.competitionRef);
      case 'teams':
        return this.syncTeams.execute(job.data.competitionRef, job.data.seasonYear);
      case 'fixtures':
        return this.syncFixtures.execute(job.data.competitionRef, job.data.seasonYear);
      case 'standings':
        return this.syncStandings.execute(job.data.competitionRef, job.data.seasonYear);
      case 'live-tick':
        return this.liveTick();
      case 'daily-refresh':
        return this.dailyRefresh();
      default:
        throw new Error(`Unknown job: ${(job as Job).name}`);
    }
  }

  // Solo llama al API si la base indica que puede haber fútbol en juego: costo cero fuera de partidos.
  private async liveTick(): Promise<number> {
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 60 * 1000);
    const staleThreshold = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    const candidates = await this.prisma.match.count({
      where: {
        OR: [
          { status: { in: ['in_play', 'paused'] } },
          { status: 'scheduled', kickoffUtc: { gte: staleThreshold, lte: soon } },
        ],
      },
    });
    if (candidates === 0) return 0;
    return this.syncFixtures.syncLive();
  }

  private async dailyRefresh(): Promise<void> {
    for (const { providerRef } of CONFIGURED_COMPETITIONS) {
      await this.enqueue('competition', { competitionRef: providerRef });
    }
    const seasons = await this.prisma.season.findMany({
      where: { isCurrent: true, competition: { isActive: true } },
      select: { year: true, competition: { select: { id: true } } },
    });
    for (const season of seasons) {
      const ref = await this.prisma.externalReference.findUnique({
        where: {
          provider_entityType_entityId: {
            provider: 'api-football',
            entityType: 'competition',
            entityId: season.competition.id,
          },
        },
        select: { providerRef: true },
      });
      if (!ref) continue;
      await this.enqueue('teams', { competitionRef: ref.providerRef, seasonYear: season.year });
      await this.enqueue('fixtures', { competitionRef: ref.providerRef, seasonYear: season.year });
      await this.enqueue('standings', { competitionRef: ref.providerRef, seasonYear: season.year });
    }
  }
}
