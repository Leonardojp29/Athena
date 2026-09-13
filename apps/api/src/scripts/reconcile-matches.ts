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
  let anterior: number | null = null;
  for (let vuelta = 1; vuelta <= 20; vuelta++) {
    const escritos = await fixtures.reconcileStale();
    if (escritos === 0) break;

    /*
     * Cuando una vuelta devuelve lo mismo que la anterior, los que quedan son partidos que el
     * proveedor tampoco resolvió: los manda "no empezados" con la hora ya pasada, o los dejó
     * aplazados sin fecha nueva. Volver a preguntar no los va a cambiar, así que se corta. Sin
     * esto el bucle gastaba las veinte vueltas repreguntando por los mismos cinco.
     */
    if (escritos === anterior) {
      console.log(`Quedan ${escritos} que el proveedor todavía no actualizó: no insisto.`);
      break;
    }
    anterior = escritos;

    total += escritos;
    const { dayRemaining } = await budget.snapshot();
    console.log(`vuelta ${vuelta}: ${escritos} partidos · cuota ${dayRemaining ?? '?'}`);
  }

  console.log(`Listo: ${total} partidos actualizados`);
  await app.close();
}

void main();
