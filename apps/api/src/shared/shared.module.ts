import { Global, Inject, Module, type OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { ApiBudgetService } from './api-budget.service.js';
import { PrismaService } from './prisma.service.js';
import { redisProvider, REDIS } from './redis.provider.js';

@Global()
@Module({
  providers: [PrismaService, redisProvider, ApiBudgetService],
  exports: [PrismaService, REDIS, ApiBudgetService],
})
export class SharedModule implements OnModuleDestroy {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
