import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncMatchPlayersUseCase } from '../modules/sync/sync-match-players.usecase.js';
import { SyncSeasonPlayersUseCase } from '../modules/sync/sync-season-players.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class BackfillModule {}

const CONCURRENCY = Number(process.env.BACKFILL_CONCURRENCY ?? 5);

/**
 * Dos fases y el orden importa: primero las temporadas, que traen el nombre completo, y
 * después los partidos. Al revés los jugadores nacerían de una alineación con el nombre
 * abreviado y el slug quedaría "j-alarcon" para siempre, porque una URL no se cambia.
 *
 * Con FASE=temporadas o FASE=partidos se corre una sola.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(BackfillModule, {
    logger: ['warn', 'error'],
  });
  const prisma = app.get(PrismaService);
  const seasonPlayers = app.get(SyncSeasonPlayersUseCase);
  const matchPlayers = app.get(SyncMatchPlayersUseCase);
  const budget = app.get(ApiBudgetService);

  const fase = process.env.FASE ?? 'todo';

  if (fase === 'todo' || fase === 'temporadas') {
    const seasons = await prisma.season.findMany({
      where: { isCurrent: true, competition: { isActive: true } },
      select: { year: true, competition: { select: { id: true, name: true } } },
    });
    const refs = await prisma.externalReference.findMany({
      where: {
        provider: 'api-football',
        entityType: 'competition',
        entityId: { in: seasons.map((s) => s.competition.id) },
      },
      select: { entityId: true, providerRef: true },
    });
    const refById = new Map(refs.map((r) => [r.entityId, r.providerRef]));

    console.log(`Fase 1: ${seasons.length} temporadas activas`);
    for (const season of seasons) {
      const ref = refById.get(season.competition.id);
      if (!ref) {
        console.warn(`  · ${season.competition.name}: sin referencia externa`);
        continue;
      }
      try {
        let n = await seasonPlayers.execute(ref, season.year);
        let year = season.year;

        /*
         * Una liga europea que arrancó hace dos semanas todavía no tiene acumulados. Se cae
         * a la campaña anterior, que sí existe como temporada propia: un perfil con los
         * números del año pasado es mejor que un perfil vacío, siempre que diga qué año es.
         */
        if (n === 0) {
          year = season.year - 1;
          n = await seasonPlayers.execute(ref, year);
          if (n > 0) console.log(`  · ${season.competition.name}: sin datos de ${season.year}`);
        }
        console.log(`  ✓ ${season.competition.name} ${year}: ${n} jugadores`);
      } catch (error) {
        console.error(`  ✗ ${season.competition.name}: ${String(error).slice(0, 160)}`);
      }
    }
    const { dayRemaining } = await budget.snapshot();
    console.log(`Fase 1 terminada. Cuota restante: ${dayRemaining ?? '?'}`);
  }

  if (fase === 'todo' || fase === 'partidos') {
    const limit = Number(process.env.BACKFILL_LIMIT ?? 2000);
    const pending = await prisma.match.findMany({
      where: { status: 'finished', playerStatistics: { none: {} }, lineups: { some: {} } },
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

    console.log(`Fase 2: ${refs.length} partidos por completar (concurrencia ${CONCURRENCY})`);
    let done = 0;
    let failed = 0;
    const queue = [...refs];
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      for (;;) {
        const next = queue.shift();
        if (!next) return;
        try {
          await matchPlayers.execute(next.providerRef);
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
      `Fase 2 terminada: ${done} procesados, ${failed} fallos. Cuota restante: ${dayRemaining ?? '?'}`,
    );
  }

  await app.close();
}

void main();
