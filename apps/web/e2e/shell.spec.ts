import { expect, test } from '@playwright/test';

const RUTAS = ['/', '/partidos', '/competencias', '/competencias/primera-division'];

test.describe('shell del sitio', () => {
  test('la navegación se arma de datos y llega al catálogo completo', async ({ page, isMobile }) => {
    await page.goto('/');

    const header = page.locator('header');
    if (isMobile) {
      await page.getByLabel('Abrir menú').click();
      await header.getByRole('link', { name: 'Competencias', exact: true }).click();
    } else {
      await header.locator('nav details[data-menu] summary').click();
      await page.getByRole('link', { name: /ver todas las competencias/i }).click();
    }

    await expect(page).toHaveURL(/\/competencias$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/competencias/i);
    // el catálogo real tiene doce; con menos, la navegación quedó en el respaldo cableado
    expect(await page.locator('a[href^="/competencias/"]').count()).toBeGreaterThan(8);
  });

  test('el índice de partidos navega entre días', async ({ page }) => {
    await page.goto('/partidos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/partidos/i);

    await page.getByLabel('Día anterior').click();
    await expect(page).toHaveURL(/\/partidos\?fecha=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('una fecha inválida no rompe la página', async ({ page }) => {
    const res = await page.goto('/partidos?fecha=maniana');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('el pie enlaza competencias en todas las páginas', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Partidos' })).toBeVisible();
    expect(await footer.locator('a[href^="/competencias/"]').count()).toBeGreaterThan(2);
  });
});

test.describe('iconografía', () => {
  /*
   * Los emojis se usaban como iconos y se veían distintos en cada sistema operativo.
   * Este test es el que impide que vuelvan sin que nadie lo note.
   */
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

  for (const ruta of RUTAS) {
    test(`${ruta} no usa emojis como iconos`, async ({ page }) => {
      await page.goto(ruta);
      const texto = await page.locator('body').innerText();
      const halladas = [...texto].filter((c) => EMOJI.test(c));
      expect(halladas, `emojis encontrados: ${halladas.join(' ')}`).toHaveLength(0);
    });
  }

  test('los iconos heredan color del tema en lugar de fijar un hex', async ({ page }) => {
    await page.goto('/');
    const conHex = await page
      .locator('svg [stroke^="#"], svg [fill^="#"], svg[stroke^="#"], svg[fill^="#"]')
      .count();
    expect(conHex).toBe(0);
  });
});
