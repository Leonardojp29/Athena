import { Global, Module } from '@nestjs/common';
import { AiBudgetService } from './ai-budget.service.js';
import { ApiBudgetService } from './api-budget.service.js';
import { KvService } from './kv.service.js';
import { PrismaService } from './prisma.service.js';
import { ViewCacheService } from './view-cache.service.js';

@Global()
@Module({
  providers: [PrismaService, KvService, ApiBudgetService, AiBudgetService, ViewCacheService],
  exports: [PrismaService, KvService, ApiBudgetService, AiBudgetService, ViewCacheService],
})
export class SharedModule {}
