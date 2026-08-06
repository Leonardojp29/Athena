import { randomUUID } from 'node:crypto';
import * as Sentry from '@sentry/node';

/**
 * Sentry es opcional: sin SENTRY_DSN el proceso arranca igual y solo quedan los
 * logs estructurados. Debe llamarse antes de crear la app de Nest.
 */
export function initObservability(service: 'api' | 'worker'): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    initialScope: { tags: { service } },
  });
}

export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(error, { extra: context });
}

/** Log en una línea JSON: legible por humanos en dev y parseable por cualquier colector. */
export function logJson(
  level: 'info' | 'warn' | 'error',
  message: string,
  fields: Record<string, unknown> = {},
): void {
  const line = JSON.stringify({ level, message, at: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function newRequestId(): string {
  return randomUUID();
}
