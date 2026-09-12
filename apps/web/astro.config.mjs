// @ts-check
import { existsSync } from 'node:fs';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// El .env vive en la raíz del monorepo, no en apps/web: sin esto las variables
// PUBLIC_ (la URL del API, la del sitio) se compilarían vacías.
const ENV_DIR = '../..';
const rootEnv = new URL('../../.env', import.meta.url);
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

/*
 * Sin PUBLIC_SITE_URL el sitio se compila igual y sale a producción con los canónicos, el sitemap y
 * las imágenes de compartir apuntando a localhost. Eso no falla en ningún lado y desindexa el sitio
 * entero, así que acá se rompe a propósito.
 */
if (process.env.NODE_ENV === 'production' && !process.env.PUBLIC_SITE_URL) {
  throw new Error('Falta PUBLIC_SITE_URL: los canónicos y el sitemap saldrían apuntando a localhost.');
}

const siteUrl = new URL(process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321');

export default defineConfig({
  site: siteUrl.href,
  output: 'server',
  /*
   * Dos casas, un solo código: en Vercel manda su adaptador (la plataforma define la variable
   * VERCEL sola) y en cualquier otro lado la web es un proceso Node de siempre, que es como corre
   * el stack local. Elegirlo por entorno evita mantener dos configs que divergen.
   */
  adapter: process.env.VERCEL ? vercel() : node({ mode: 'standalone' }),
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
