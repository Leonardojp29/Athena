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
  security: {
    // Sin esto Astro descarta el Host recibido y calcula el origen como "http://localhost"
    // (sin puerto), con lo que la protección CSRF rechaza TODO POST de formulario.
    allowedDomains: [
      {
        hostname: siteUrl.hostname,
        protocol: siteUrl.protocol.replace(':', ''),
        ...(siteUrl.port ? { port: siteUrl.port } : {}),
      },
    ],
  },
  vite: {
    envDir: ENV_DIR,
    plugins: [tailwindcss()],
  },
});
