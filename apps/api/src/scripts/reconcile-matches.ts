import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApiBudgetService } from '../shared/api-budget.service.js';
import { SharedModule } from '../shared/shared.module.js';
import { SyncFixturesUseCase } from '../modules/sync/sync-fixtures.usecase.js';
import { SyncModule } from '../modules/sync/sync.module.js';

@Module({ imports: [SharedModule, SyncModule] })
class ReconcileModule {}

/**
 * Cierra de una vez los partidos que quedaron con un estado viejo.
 *
 * El worker hace esto solo en cada tick, pero después de una caída larga hay cientos y el tick
 * procesa doscientos por corrida. Esto es la manija para tirarlos todos ahora: se repite hasta que
 * no queda ninguno, que es cuando `reconcileStale` devuelve cero.
 */
async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(ReconcileModule, {
    logger: ['log', 'warn', 'error'],
  });
  const fixtures = app.get(SyncFixturesUseCase);
  const budget = app.get(ApiBudgetService);

  let total = 0;
  for (let vuelta = 1; vuelta <= 20; vuelta++) {
    const escritos = await fixtures.reconcileStale();
    total += escritos;
    if (escritos === 0) break;
    const { dayRemaining } = await budget.snapshot();
    console.log(`vuelta ${vuelta}: ${escritos} partidos · cuota ${dayRemaining ?? '?'}`);
  }

  console.log(`Listo: ${total} partidos actualizados`);
  await app.close();
}

void main();
