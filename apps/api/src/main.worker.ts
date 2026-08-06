import 'reflect-metadata';
import { Worker } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Worker entrypoint — same codebase as the API, separate process (ADR-002).
 * Fase 0 ships a single 'system' queue so infrastructure can be verified;
 * sync and derivation queues arrive with Fase 1.
 */
const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  'system',
  async (job) => {
    if (job.name === 'ping') {
      return { pong: true, at: new Date().toISOString() };
    }
    throw new Error(`Unknown job: ${job.name}`);
  },
  { connection },
);

worker.on('completed', (job, result) => {
  console.log(`[worker] ${job.name}#${job.id} completed`, result);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] ${job?.name}#${job?.id} failed: ${err.message}`);
});

console.log('Athena worker listening on queue "system"');
