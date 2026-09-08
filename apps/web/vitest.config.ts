import { defineConfig } from 'vitest/config';

/*
 * Las pruebas unitarias de la web. Solo `src`: los `e2e` son de Playwright y si vitest los tomara
 * intentaría ejecutar sus `test.describe` sin navegador.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
