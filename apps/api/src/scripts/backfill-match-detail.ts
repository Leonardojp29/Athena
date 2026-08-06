import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncMatchDetailUseCase } from '../modules/sync/sync-match-detail.usecase.js';
import { SyncMatchEventsUseCase } from '../modules/sync/sync-match-events.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class BackfillModule {}

const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY ?? 5);

/**
 * Trae eventos, estadísticas y alineaciones de todos los partidos finalizados
 * que aún no los tienen. Con 3 requests por partido y el límite del plan en
 * 900/min, la concurrencia se mantiene baja a propósito.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(BackfillModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const syncEvents = app.get(SyncMatchEventsUseCase);
  const syncDetail = app.get(SyncMatchDetailUseCase);
  const budget = app.get(ApiBudgetService);

  const limit = Number(process.env.BACKFILL_LIMIT ?? 2000);
  const pending = await prisma.match.findMany({
    where: {
      status: 'finished',
      OR: [{ statistics: { none: {} } }, { events: { none: {} } }],
    },
    orderBy: { kickoffUtc: 'desc' },
    take: limit,
    select: { id: true },
  });

  const refs = await prisma.externalReference.findMany({
    where: {
      provider: 'api-football',
      entityType: 'match',
      entityId: { in: pending.map((m) => m.id) },
    },
    select: { providerRef: true },
  });

  console.log(`${refs.length} partidos por completar (concurrencia ${CONCURRENCY})`);
  let done = 0;
  let failed = 0;

  const queue = [...refs];
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const next = queue.shift();
      if (!next) return;
      try {
        await syncEvents.execute(next.providerRef);
        await syncDetail.execute(next.providerRef);
      } catch (error) {
        failed++;
        console.error(`  ✗ ${next.providerRef}: ${String(error).slice(0, 120)}`);
      }
      done++;
      if (done % 50 === 0) {
        const { dayRemaining } = await budget.snapshot();
        console.log(
          `  ${done}/${refs.length} (fallos ${failed}) · cuota restante ${dayRemaining ?? '?'}`,
        );
      }
    }
  });
  await Promise.all(workers);

  const { dayRemaining } = await budget.snapshot();
  console.log(
    `Backfill terminado: ${done} procesados, ${failed} fallos. Cuota restante: ${dayRemaining ?? '?'}`,
  );
  await app.close();
}

void main();
