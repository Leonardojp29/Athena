import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './modules/worker/worker.module.js';
import { initObservability, logJson, reportError } from './shared/observability.js';

initObservability('worker');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  logJson('info', 'worker_started');
}

// Un worker que muere en silencio deja el sync detenido sin que nadie se entere.
process.on('unhandledRejection', (reason) => {
  logJson('error', 'unhandled_rejection', { reason: String(reason) });
  reportError(reason);
});

void bootstrap();
