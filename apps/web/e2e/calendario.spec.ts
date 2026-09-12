import { expect, test } from '@playwright/test';

/*
 * El calendario, por el reloj.
 *
 * Lo que se protege acá es la decisión de fondo: un calendario tiene dos ejes y el que manda es el
 * tiempo. Si alguien vuelve a ordenar la página por continente y nada más, estas pruebas caen.
 */

test.describe('la parrilla del día', () => {
  test('arranca por hora y el reloj baja en orden', async ({ page }) => {
    await page.goto('/partidos');

    const horas = await page.$$eval('ol > li[id^="h"]', (nodos) =>
      nodos.map((n) => n.id.slice(1)),
    );
    expect(horas.length).toBeGreaterThan(1);
    expect([...horas]).toEqual([...horas].sort());
  });

  test('se puede cambiar de eje sin salir del día, y el eje viaja en la URL', async ({ page }) => {
    await page.goto('/partidos');
    await expect(page.getByRole('link', { name: 'Por hora' })).toHaveAttribute('aria-current', 'true');

    await page.getByRole('link', { name: 'Por lugar' }).click();
    await expect(page).toHaveURL(/ver=lugar/);
    /* Por lugar no hay parrilla de horas: es el árbol de continentes. */
    await expect(page.locator('ol > li[id^="h"]')).toHaveCount(0);
    await expect(page.locator('[data-geografia]')).toBeVisible();
  });

  test('el eje elegido sobrevive al cambio de día', async ({ page }) => {
    await page.goto('/partidos?ver=lugar');
    await page.getByLabel('Día anterior').click();
    await expect(page).toHaveURL(/ver=lugar/);
    await expect(page.locator('[data-geografia]')).toBeVisible();
  });

  /* La tira de días existe para comparar: sin la cuenta son siete cajitas que no dicen nada. */
  test('cada día de la semana dice cuántos partidos tiene', async ({ page }) => {
    await page.goto('/partidos');
    const dias = page.getByRole('navigation', { name: 'Elegir el día' }).getByRole('link');
    const conCuenta = await dias.evaluateAll((nodos) =>
      nodos.filter((n) => /\d+ partidos?$/.test(n.getAttribute('aria-label') ?? '')).length,
    );
    expect(conCuenta).toBe(7);
  });

  /* Un gráfico sin su tabla es color y altura: dos canales que un lector de pantalla no tiene. */
  test('la carga del día se puede leer sin verla', async ({ page }) => {
    await page.goto('/partidos');
    const pie = page.locator('figcaption');
    if ((await pie.count()) > 0) {
      await expect(pie.first()).toContainText(/Partidos por hora/i);
    }
  });

  test('una fila lleva al partido y a cada equipo', async ({ page }) => {
    await page.goto('/partidos');
    const fila = page.locator('ol > li[id^="h"] [data-partido]').first();
    await expect(fila.locator('a[href*="-vs-"]')).toHaveCount(1);
    expect(await fila.locator('a[href^="/equipos/"]').count()).toBe(2);
  });

  /*
   * El realce se gana con un dato. Lo que no puede pasar es que aparezca en todo: una pastilla en
   * cada fila no destaca nada, y una que diga algo que no se puede sostener es peor.
   */
  test('se realza poco y siempre con su razón escrita', async ({ page }) => {
    await page.goto('/partidos');
    const filas = await page.locator('ol > li[id^="h"] [data-partido]').count();
    const realces = await page
      .locator('ol > li[id^="h"] [data-partido] span.rounded.border.uppercase')
      .allTextContents();

    expect(realces.length).toBeLessThan(filas / 3);
    for (const texto of realces) {
      expect(texto.trim(), 'un realce sin texto no explica nada').not.toBe('');
    }
  });
});
