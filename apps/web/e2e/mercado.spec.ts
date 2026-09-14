import { expect, test } from '@playwright/test';

/*
 * El palmarés y el mercado de pases.
 *
 * Dos datos que el proveedor sirve con aristas: títulos repetidos —una vez con año y otra sin— y el
 * mismo fichaje fechado distinto según a qué club se le pregunte. Lo que se protege acá es que esa
 * aspereza no llegue a la pantalla.
 */

test.describe('el palmarés de un futbolista', () => {
  test('cuenta los títulos y los agrupa por temporada', async ({ page }) => {
    await page.goto('/jugadores/lionel-messi');
    const tarjeta = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Palmarés' }) });
    await expect(tarjeta).toBeVisible();
    await expect(tarjeta).toContainText(/\d+ títulos/);

    /* Los años bajan del más nuevo al más viejo: un palmarés desordenado no se puede leer. */
    const anios = await tarjeta
      .locator('li > span.text-right')
      .allTextContents()
      .then((t) => t.map((x) => x.trim()).filter((x) => /^\d{4}/.test(x)));
    expect(anios.length).toBeGreaterThan(1);
    expect([...anios]).toEqual([...anios].sort().reverse());
  });

  /*
   * Messi tiene setenta títulos: sin plegar, la tarjeta se come la columna entera. La mediana son
   * ocho y esos entran sin plegable, así que el plegable aparece solo donde hace falta.
   */
  test('una carrera larga se pliega y se puede abrir sin JavaScript', async ({ page }) => {
    await page.goto('/jugadores/lionel-messi');
    const tarjeta = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Palmarés' }) });
    const alto = (await tarjeta.boundingBox())?.height ?? 0;
    expect(alto).toBeLessThan(900);

    const desplegar = tarjeta.locator('summary');
    await expect(desplegar).toContainText(/Ver (el otro título|los otros \d+ títulos)/);
    await desplegar.click();
    expect((await tarjeta.boundingBox())?.height ?? 0).toBeGreaterThan(alto);
  });

  /* El proveedor manda el mismo título dos veces, una con año y otra sin: no pueden salir los dos. */
  test('no repite un título fechado en un bloque sin año', async ({ page }) => {
    await page.goto('/jugadores/lionel-messi');
    const tarjeta = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Palmarés' }) });
    await tarjeta.locator('summary').click();
    const sinAnio = tarjeta.locator('li > span.text-right', { hasText: 'Sin año' });
    expect(await sinAnio.count()).toBeLessThanOrEqual(1);
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
