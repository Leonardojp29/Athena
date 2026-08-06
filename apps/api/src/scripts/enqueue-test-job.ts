import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Fase 0 smoke test: enqueue a ping into the 'system' queue.
 * Run the worker (pnpm start:worker) in another terminal to see it processed.
 */
const connection = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const queue = new Queue('system', { connection });

const job = await queue.add('ping', { requestedAt: new Date().toISOString() });

console.log(`Enqueued ping job #${job.id}`);
await queue.close();
await connection.quit();
