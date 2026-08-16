import { Redis } from 'ioredis';

/**
 * Borra la caché de vistas y nada más.
 *
 * Existe por una lección cara: la caché y la cola de trabajos vivían en la misma base de Redis, y
 * un `FLUSHDB` para ver datos frescos borraba de paso los trabajos pendientes. Veintiún partidos de
 * nueve competencias se quedaron sin alineación por eso, sin un solo error en el log —borrar una
 * cola no falla, simplemente deja de haber trabajo—.
 *
 * La cola ya vive en otra base, pero igual conviene tener el comando: `FLUSHDB` borra también los
 * candados y cualquier cosa que se guarde mañana.
 *
 *   pnpm --filter @athena/api cache:limpiar            todo lo que empiece con `view:`
 *   PATRON="view:competition:*" pnpm ... cache:limpiar  solo una parte
 */
async function main(): Promise<void> {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const patron = process.env.PATRON ?? 'view:*';
  const redis = new Redis(url, { maxRetriesPerRequest: null });

  let borradas = 0;
  let cursor = '0';
  do {
    const [siguiente, claves] = await redis.scan(cursor, 'MATCH', patron, 'COUNT', 500);
    cursor = siguiente;
    if (claves.length > 0) borradas += await redis.del(...claves);
  } while (cursor !== '0');

  console.log(`${borradas} claves borradas con el patrón ${patron}`);
  await redis.quit();
}

void main();
