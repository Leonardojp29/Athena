import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../shared/prisma.service.js';
import { REDIS } from '../../shared/redis.provider.js';

export const FLAGS = {
  aiInsights: 'ai_insights',
  semanticSearch: 'semantic_search',
  liveMatchCenter: 'live_match_center',
  recommendations: 'recommendations',
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

const CACHE_KEY = 'athena:flags';
const CACHE_TTL_SECONDS = 45;

@Injectable()
export class FeatureFlagService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async isEnabled(key: FlagKey): Promise<boolean> {
    return (await this.all())[key] ?? false;
  }

  async all(): Promise<Record<string, boolean>> {
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached) as Record<string, boolean>;

    const rows = await this.prisma.featureFlag.findMany({
      select: { key: true, enabled: true },
    });
    const flags = Object.fromEntries(rows.map((row) => [row.key, row.enabled]));
    await this.redis.set(CACHE_KEY, JSON.stringify(flags), 'EX', CACHE_TTL_SECONDS);
    return flags;
  }

  async set(key: string, enabled: boolean, description?: string): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, ...(description ? { description } : {}) },
      create: { key, enabled, description: description ?? null },
    });
    await this.redis.del(CACHE_KEY);
  }
}
