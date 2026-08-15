import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { PrismaService } from '../shared/prisma.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncStandingsUseCase } from '../modules/sync/sync-standings.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class TablasModule {}

/**
 * Las tablas de posiciones de las temporadas vigentes: un pedido por competencia.
 *
 * Existe porque la tabla es lo que más se mira y no puede depender de una cola con cientos de
 * trabajos por delante ni de un cron de medianoche. Sin argumentos hace las 61 competencias activas
 * —61 pedidos, medio minuto—; con `LIGAS=primera-division` hace una sola.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(TablasModule, { logger: ['warn', 'error'] });
  const prisma = app.get(PrismaService);
  const syncStandings = app.get(SyncStandingsUseCase);
  const budget = app.get(ApiBudgetService);

  const ligas = (process.env.LIGAS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const seasons = await prisma.season.findMany({
    where: {
      isCurrent: true,
      competition: { isActive: true, ...(ligas.length > 0 ? { slug: { in: ligas } } : {}) },
    },
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
  const refPorId = new Map(refs.map((r) => [r.entityId, r.providerRef]));

  console.log(`${seasons.length} temporadas vigentes`);
  let hechas = 0;
  let fallos = 0;
  for (const season of seasons) {
    const ref = refPorId.get(season.competition.id);
    if (!ref) continue;
    try {
      const filas = await syncStandings.execute(ref, season.year);
      hechas++;
      console.log(`  ✓ ${season.competition.name}: ${filas} filas`);
    } catch (error) {
      fallos++;
      console.error(`  ✗ ${season.competition.name}: ${String(error).slice(0, 120)}`);
    }
  }

  const { dayRemaining } = await budget.snapshot();
  console.log(`${hechas} tablas al día, ${fallos} fallos. Cuota restante: ${dayRemaining ?? '?'}`);
  await app.close();
}

void main();
