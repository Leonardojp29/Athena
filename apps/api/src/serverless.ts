import type { IncomingMessage, ServerResponse } from 'node:http';
import { crearApp } from './crear-app.js';
import { initObservability } from './shared/observability.js';

/**
 * El API como función de Vercel.
 *
 * La aplicación se arma una sola vez por instancia y las invocaciones calientes la reutilizan: el
 * costo de levantar Nest se paga en el arranque en frío y nunca por request. No hay `listen`: se
 * toma el Express de adentro y se le entrega cada request tal como llega de la plataforma.
 */
initObservability('api');

let listo: Promise<(req: IncomingMessage, res: ServerResponse) => void> | null = null;

async function prepararHandler() {
  const app = await crearApp();
  await app.init();
  return app.getHttpAdapter().getInstance() as (req: IncomingMessage, res: ServerResponse) => void;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  listo ??= prepararHandler();
  (await listo)(req, res);
}
