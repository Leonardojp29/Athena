import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

let client: PrismaClient | undefined;

/** Singleton Prisma client — one connection pool per process. */
export function getPrismaClient(): PrismaClient {
  client ??= new PrismaClient();
  return client;
}
