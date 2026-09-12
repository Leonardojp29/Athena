import { expect, test } from '@playwright/test';

/*
 * La calculadora no es un pronóstico de Athena: es el escenario del lector, y lo que se prueba acá
 * es esa promesa. Que escribir un marcador mueva la tabla, que el escenario viva en la URL y que
 * el enlace diga lo mismo aunque el JavaScript no llegue nunca.
 */
test.describe('calculadora', () => {
  test('escribir un marcador mueve la tabla y el escenario queda en la URL', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/calculadora');
    if (isMobile) await page.getByRole('button', { name: 'partidos' }).click();

    const celda = page.locator('[data-partido-calculadora] input').first();
    await expect(celda).toBeVisible({ timeout: 15_000 });

    await celda.fill('3');
    await expect(page).toHaveURL(/\?p=/, { timeout: 10_000 });
    if (isMobile) await page.getByRole('button', { name: 'tablas' }).click();
    /* El ▲▼ solo aparece cuando el pronóstico movió a alguien: sin él, la tabla es la de hoy. */
    await expect(page.locator('[title*="con tu escenario"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('el escenario sobrevive a una recarga y Reiniciar lo borra', async ({ page, isMobile }) => {
    await page.goto('/calculadora');
    if (isMobile) await page.getByRole('button', { name: 'partidos' }).click();
    const celda = page.locator('[data-partido-calculadora] input').first();
    await expect(celda).toBeVisible({ timeout: 15_000 });
    await celda.fill('4');
    await expect(page).toHaveURL(/\?p=/, { timeout: 10_000 });

    /*
     * La URL vuelve a llenarse sola cuando el escenario guardado se recupera: esperar eso y no la
     * celda evita medir la hidratación con un cronómetro.
     */
    await page.goto('/calculadora');
    await expect(page).toHaveURL(/\?p=/, { timeout: 30_000 });
    if (isMobile) await page.getByRole('button', { name: 'partidos' }).click();
    await expect(page.locator('[data-partido-calculadora] input').first()).toHaveValue('4');

    await page.getByRole('button', { name: 'Reiniciar' }).click();
    await page.getByRole('button', { name: 'Borrar todo' }).click();
    await expect(page).not.toHaveURL(/\?p=/, { timeout: 10_000 });
  });

  /*
   * La razón de decodificar el `?p=` en el servidor. Un enlace que solo dice algo después de
   * hidratar no es un enlace compartible: es una promesa.
   */
  test('un enlace compartido se lee sin JavaScript', async ({ browser, request }) => {
    const datos = await (
      await request.get('http://localhost:3001/v1/views/calculadora/primera-division')
    ).json();

    const porJugar = (datos.partidos as unknown[][]).find((p) => p[4] === 'scheduled');
    test.skip(!porJugar, 'la temporada no tiene partidos por jugar');

    const equipos = datos.equipos as Array<[string, string, string, string | null]>;
    const local = equipos[porJugar![2] as number];
    const visita = equipos[porJugar![3] as number];

    const contexto = await browser.newContext({ javaScriptEnabled: false });
    const pagina = await contexto.newPage();
    /* El código lo arma el servidor: acá solo hace falta que la página lo entienda. */
    await pagina.goto('/calculadora');
    const sinJs = pagina.locator('table tbody tr');
    await expect(sinJs.first()).toBeVisible({ timeout: 15_000 });
    expect(await sinJs.count()).toBe(18);
    await expect(pagina.getByText('Camino al título')).toBeVisible();
    await expect(pagina.getByRole('link', { name: local![1] }).first()).toBeVisible();
    await expect(pagina.getByRole('link', { name: visita![1] }).first()).toBeVisible();
    await contexto.close();
  });

  test('las probabilidades aparecen y reparten los cupos que hay', async ({ page }) => {
    await page.goto('/calculadora');
    await page.getByRole('button', { name: 'Tabla anual' }).click();

    /* Cinco mil temporadas en un Worker: con la suite entera en paralelo puede tardar. */
    const celdas = page.locator('table tbody tr td:nth-last-child(2)');
    await expect(celdas.first()).not.toHaveText('—', { timeout: 40_000 });

    const textos = await celdas.allTextContents();
    const total = textos.reduce((suma, texto) => suma + Number(texto.replace(/[^\d]/g, '')), 0);
    /* Cuatro cupos de Libertadores repartidos entre dieciocho: la suma ronda el 400 %. */
    expect(total).toBeGreaterThan(360);
    expect(total).toBeLessThan(440);
  });

  test('un resultado ya jugado no se puede editar', async ({ page, isMobile }) => {
    await page.goto('/calculadora');
    if (isMobile) await page.getByRole('button', { name: 'partidos' }).click();
    await expect(page.locator('[data-partido-calculadora]').first()).toBeVisible({
      timeout: 15_000,
    });
    const jugados = page.locator('[data-partido-calculadora]:not([data-editable])');
    expect(await jugados.count()).toBeGreaterThan(0);
    expect(await jugados.first().locator('input').count()).toBe(0);
  });
});
