import { expect, test } from '@playwright/test';

/*
 * El palmarés y el mercado de pases.
 *
 * Dos datos que el proveedor sirve con aristas: títulos repetidos —una vez con año y otra sin— y el
 * mismo fichaje fechado distinto según a qué club se le pregunte. Lo que se protege acá es que esa
 * aspereza no llegue a la pantalla.
 */

test.describe('el palmarés de un futbolista', () => {
  const tarjetaDe = (page: import('@playwright/test').Page) =>
    page.locator('section').filter({ has: page.getByRole('heading', { name: 'Palmarés' }) });

  test('cuenta los títulos y los ordena del más nuevo al más viejo', async ({ page }) => {
    await page.goto('/jugadores/lionel-messi');
    const tarjeta = tarjetaDe(page);
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText(/\d+ títulos/);

    /* Es una línea de tiempo: si los años no bajan, no es una línea, es una lista desordenada. */
    const anios = (await tarjeta.locator('ol > li > span').first().textContent())
      ? await tarjeta.locator('ol > li').evaluateAll((nodos) =>
          nodos.map((n) => n.querySelector('span')?.textContent?.trim() ?? '').filter((t) => /^\d{4}/.test(t)),
        )
      : [];
    expect(anios.length).toBeGreaterThan(1);
    expect([...anios]).toEqual([...anios].sort().reverse());
  });

  /* La línea corre a lo ancho: apretada en media columna deja de ser una línea. */
  test('la línea desplaza a lo ancho en vez de crecer a lo alto', async ({ page }) => {
    await page.goto('/jugadores/lionel-messi');
    const tarjeta = tarjetaDe(page);
    expect((await tarjeta.boundingBox())?.height ?? 0).toBeLessThan(400);

    const riel = tarjeta.locator('.palmares-riel');
    const [ancho, visible] = await riel.evaluate((n) => [n.scrollWidth, n.clientWidth]);
    expect(ancho).toBeGreaterThan(visible);
  });

  /* El proveedor manda el mismo título dos veces, una con año y otra sin: no pueden salir los dos. */
  test('no repite un título fechado en un grupo sin año', async ({ page }) => {
    await page.goto('/jugadores/lionel-messi');
    const sinAnio = tarjetaDe(page).locator('ol > li > span', { hasText: 'Sin año' });
    expect(await sinAnio.count()).toBeLessThanOrEqual(1);
  });

  /* Los clubes son parte de quién es el futbolista, no un dato de su temporada. */
  test('los clubes viven en la banda y llevan a su página', async ({ page }) => {
    await page.goto('/jugadores/lionel-messi');
    const enLaBanda = page.locator('section.bg-banda a[href^="/equipos/"]');
    expect(await enLaBanda.count()).toBeGreaterThan(0);
  });
});

test.describe('las altas y bajas de un club', () => {
  test('muestra las dos direcciones con el club del otro lado', async ({ page }) => {
    await page.goto('/equipos/botafogo');
    const tarjeta = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Altas y bajas' }) });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText('Llegaron');
    await expect(tarjeta).toContainText('Se fueron');
    /* Cada movimiento lleva a la ficha del futbolista: un nombre que no lleva a ningún lado no sirve. */
    expect(await tarjeta.locator('a[href^="/jugadores/"]').count()).toBeGreaterThan(0);
  });

  /*
   * El mismo pase llega con dos fechas según a qué club se le pregunte. Dos filas iguales en la
   * misma tarjeta es el error que hace desconfiar de todo lo demás.
   */
  test('no muestra el mismo fichaje dos veces', async ({ page }) => {
    await page.goto('/equipos/botafogo');
    const tarjeta = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Altas y bajas' }) });
    for (const columna of await tarjeta.locator('section').all()) {
      const nombres = await columna.locator('a[href^="/jugadores/"] > span:first-child').allTextContents();
      expect(new Set(nombres).size, `repetido en ${await columna.locator('p').first().textContent()}`).toBe(
        nombres.length,
      );
    }
  });

  /* Cuatro de cada diez pases no dicen qué fueron: ahí no se escribe nada en vez de "Desconocido". */
  test('nunca escribe que no sabe', async ({ page }) => {
    await page.goto('/equipos/botafogo');
    const tarjeta = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Altas y bajas' }) });
    await expect(tarjeta).not.toContainText(/desconocido/i);
  });
});
