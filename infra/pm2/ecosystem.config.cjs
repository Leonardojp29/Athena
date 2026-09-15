const { resolve } = require('node:path');

const raiz = resolve(__dirname, '../..');
const envDelApi = ['--env-file-if-exists=.env', '--env-file-if-exists=.env.local'];

const comunes = {
  exec_mode: 'fork',
  instances: 1,
  autorestart: true,
  max_restarts: 10,
  max_memory_restart: '512M',
  time: true,
  merge_logs: true,
};

module.exports = {
  apps: [
    {
      ...comunes,
      name: 'athena-api',
      cwd: resolve(raiz, 'apps/api'),
      script: 'dist/main.api.js',
      node_args: envDelApi,
      env: { PORT: process.env.API_PORT ?? 3001 },
    },
    {
      ...comunes,
      name: 'athena-worker',
      cwd: resolve(raiz, 'apps/api'),
      script: 'dist/main.worker.js',
      node_args: envDelApi,
      max_memory_restart: '768M',
    },
    {
      ...comunes,
      name: 'athena-web',
      cwd: resolve(raiz, 'apps/web'),
      script: 'dist/server/entry.mjs',
      env: { PORT: process.env.WEB_PORT ?? 4321, HOST: process.env.WEB_HOST ?? '127.0.0.1' },
    },
  ],
};
