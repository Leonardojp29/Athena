import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:4321';

/**
 * Los E2E corren contra el stack ya levantado (./infra/dev-stack.sh): necesitan
 * datos reales, así que no montan un servidor propio con base vacía.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  /*
   * Un reintento también en local. Mi Leyenda tiene una escena de canvas que corre a sesenta cuadros
   * y una celebración que se pone delante de la pantalla: con cuatro procesos peleando por la misma
   * máquina, un clic llega de vez en cuando medio cuadro tarde. Reintentar una vez distingue eso de
   * un fallo de verdad, que reaparece en el reintento.
   */
  retries: process.env.CI ? 2 : 1,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    locale: 'es-PE',
    timezoneId: 'America/Lima',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
