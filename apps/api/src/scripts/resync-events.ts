import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncMatchEventsUseCase } from '../modules/sync/sync-match-events.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class ResyncModule {}

const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY ?? 6);

/**
 * Vuelve a pedir los eventos de los partidos cuyos goles y tarjetas quedaron sin jugador.
 *
 * Se escribieron cuando ese futbolista todavía no existía en Athena, y el writer descartaba el
 * ref del proveedor, así que no hay forma de volver a vincularlos sin preguntar: cuesta un
 * request por partido. De ahora en más el ref queda guardado en el detalle y esto no vuelve a
 * hacer falta.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ResyncModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const syncEvents = app.get(SyncMatchEventsUseCase);
  const budget = app.get(ApiBudgetService);

  const afectados = await prisma.$queryRawUnsafe<Array<{ match_id: string }>>(
    'SELECT DISTINCT match_id FROM match_events WHERE player_id IS NULL',
  );
  const refs = await prisma.externalReference.findMany({
    where: {
      provider: 'api-football',
      entityType: 'match',
      entityId: { in: afectados.map((r) => r.match_id) },
    },
    select: { providerRef: true },
  });

  console.log(`${refs.length} partidos con eventos sin vincular (concurrencia ${CONCURRENCY})`);
  let hechos = 0;
  let fallos = 0;
  const cola = [...refs];

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (;;) {
      const next = cola.shift();
      if (!next) return;
      try {
        await syncEvents.execute(next.providerRef);
      } catch (error) {
        fallos += 1;
        console.error(`  ✗ ${next.providerRef}: ${String(error).slice(0, 120)}`);
      }
      hechos += 1;
      if (hechos % 100 === 0) {
        const { dayRemaining } = await budget.snapshot();
        console.log(`  ${hechos}/${refs.length} (fallos ${fallos}) · cuota ${dayRemaining ?? '?'}`);
      }
    }
  });
  await Promise.all(workers);

  const restantes = await prisma.matchEvent.count({ where: { playerId: null } });
  console.log(`Terminado: ${hechos} partidos, ${fallos} fallos. Eventos aún sin vincular: ${restantes}`);
  await app.close();
}

void main();
