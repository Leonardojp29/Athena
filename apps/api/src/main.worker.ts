import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './modules/worker/worker.module.js';
import { SyncQueueService } from './modules/worker/sync-queue.service.js';
import { SyncScheduleService } from './modules/worker/sync-schedule.service.js';
import { initObservability, logJson, reportError } from './shared/observability.js';

initObservability('worker');

/*
 * El worker de desarrollo: el mismo tic que en producción dispara pg_cron, acá lo dispara un bucle.
 *
 * No hay cola escuchando ni proceso privilegiado: `tick()` hace lo urgente del vivo y drena la cola
 * de tareas de Postgres, igual que cuando lo invoca el endpoint interno. Un solo camino de código
 * para las dos formas de correr, que es lo que garantiza que lo probado acá sea lo desplegado allá.
 */
const CADA_MS = 60_000;

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  const queue = app.get(SyncQueueService);
  const schedules = app.get(SyncScheduleService);

  await schedules.seed();

  let corriendo = false;
  const unTic = async (): Promise<void> => {
    /* Si el tic anterior sigue —una tanda larga de tareas—, este turno se salta, no se apila. */
    if (corriendo) return;
    corriendo = true;
    try {
      /* Lo diario atrasado se recupera acá: un cron de medianoche no sirve en una máquina apagada. */
      const perdidos = await schedules.atrasados();
      if (perdidos.includes('daily-refresh')) {
        logJson('info', 'daily_refresh_recuperado');
        await queue.daily();
      }
      await queue.tick(55_000);
    } catch (error) {
      logJson('error', 'tick_fallido', { error: String(error).slice(0, 200) });
      reportError(error);
    } finally {
      corriendo = false;
    }
  };

  logJson('info', 'worker_started');
  void unTic();
  setInterval(() => void unTic(), CADA_MS);
}

// Un worker que muere en silencio deja el sync detenido sin que nadie se entere.
process.on('unhandledRejection', (reason) => {
  logJson('error', 'unhandled_rejection', { reason: String(reason) });
  reportError(reason);
});

void bootstrap();
