// @ts-check
import { existsSync } from 'node:fs';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// El .env vive en la raíz del monorepo, no en apps/web: sin esto las variables
// PUBLIC_ se compilarían vacías y la web creería que Supabase no está configurado.
const ENV_DIR = '../..';
const rootEnv = new URL('../../.env', import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const siteUrl = new URL(process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321');

export default defineConfig({
  site: siteUrl.href,
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  /*
   * Prefetch al pasar el cursor. Con las vistas cacheadas, la página ya está descargada cuando
   * el dedo llega al clic y la navegación se siente instantánea. Cuesta cerca de 1 KB de script
   * en todo el sitio, y es la única excepción al 0 KB de las páginas de entidad: el usuario
   * pidió navegación instantánea, y sin esto la primera visita a cada ruta paga el viaje.
   */
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  security: {
    /*
     * Sin esto Astro descarta el Host recibido y calcula el origen como "http://localhost" (sin
     * puerto), con lo que la protección CSRF rechaza TODO POST de formulario.
     *
     * Los dos loopbacks van juntos: `127.0.0.1` y `localhost` son el mismo servidor y orígenes
     * distintos, así que entrar por uno mientras la lista dice el otro rechazaba cada POST —el
     * botón de favoritos— como si fuera un ataque.
     */
    allowedDomains: [
      ...new Set([siteUrl.hostname, 'localhost', '127.0.0.1']),
    ].map((hostname) => ({
      hostname,
      protocol: siteUrl.protocol.replace(':', ''),
      ...(siteUrl.port ? { port: siteUrl.port } : {}),
    })),
  },
  vite: {
    envDir: ENV_DIR,
    plugins: [tailwindcss()],
  },
});
