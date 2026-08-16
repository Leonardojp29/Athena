import { crearApp } from './crear-app.js';
import { initObservability, logJson } from './shared/observability.js';

initObservability('api');

async function bootstrap(): Promise<void> {
  const app = await crearApp();
  const port = Number(process.env.PORT ?? 3001);
  await app.listen(port);
  logJson('info', 'api_started', { port, docs: `http://localhost:${port}/docs` });
}

void bootstrap();
