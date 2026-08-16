import { Injectable } from '@nestjs/common';
import { Memoria } from '../../shared/memoria.js';
import { PrismaService } from '../../shared/prisma.service.js';

export const FLAGS = {
  aiInsights: 'ai_insights',
  semanticSearch: 'semantic_search',
  liveMatchCenter: 'live_match_center',
  recommendations: 'recommendations',
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

const CACHE_KEY = 'athena:flags';
/*
 * En memoria y por proceso: en serverless, apagar un flag tarda a lo sumo estos 45 segundos en
 * llegar a todas las instancias, que es el mismo tope que ya tenía con Redis.
 */
const CACHE_TTL_SECONDS = 45;

@Injectable()
export class FeatureFlagService {
  private readonly memoria = new Memoria<string>(4);

  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(key: FlagKey): Promise<boolean> {
    return (await this.all())[key] ?? false;
  }

  async all(): Promise<Record<string, boolean>> {
    const cached = this.memoria.get(CACHE_KEY);
    if (cached) return JSON.parse(cached) as Record<string, boolean>;

    const rows = await this.prisma.featureFlag.findMany({
      select: { key: true, enabled: true },
    });
    const flags = Object.fromEntries(rows.map((row) => [row.key, row.enabled]));
    this.memoria.set(CACHE_KEY, JSON.stringify(flags), CACHE_TTL_SECONDS);
    return flags;
  }

  async set(key: string, enabled: boolean, description?: string): Promise<void> {
    await this.prisma.featureFlag.upsert({
      where: { key },
      update: { enabled, ...(description ? { description } : {}) },
      create: { key, enabled, description: description ?? null },
    });
    this.memoria.delete(CACHE_KEY);
  }
}
