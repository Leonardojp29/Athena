import { expect, test } from '@playwright/test';

/*
 * La calculadora no es un pronóstico de Athena: es el escenario del lector, y lo que se prueba acá
 * es esa promesa. Que escribir un marcador mueva la tabla, que el escenario viva en la URL y que
 * el enlace diga lo mismo aunque el JavaScript no llegue nunca.
 */
test.describe('calculadora', () => {
  test('escribir un marcador mueve la tabla y el escenario queda en la URL', async ({ page }) => {
    await page.goto('/calculadora');

    const celda = page.locator('[data-partido-calculadora] input').first();
    await expect(celda).toBeVisible({ timeout: 15_000 });

    await celda.fill('3');
    await expect(page).toHaveURL(/\?p=/, { timeout: 10_000 });
    /* El ▲▼ solo aparece cuando el pronóstico movió a alguien: sin él, la tabla es la de hoy. */
    await expect(page.locator('[title*="con tu escenario"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('el escenario sobrevive a una recarga y Reiniciar lo borra', async ({ page }) => {
    await page.goto('/calculadora');
    const celda = page.locator('[data-partido-calculadora][data-editable] input').first();
    await expect(celda).toBeVisible({ timeout: 15_000 });
    await celda.fill('4');
    await expect(page).toHaveURL(/\?p=/, { timeout: 10_000 });

    /* Recargar conserva el escenario porque está en la URL, que es donde vive. */
    await page.reload();
    await expect(page.locator('[data-partido-calculadora][data-editable] input').first()).toHaveValue(
      '4',
      { timeout: 15_000 },
    );

    /* Hay uno en el calendario y otro junto a la tabla: los dos lugares donde uno empieza de nuevo. */
    const reinicios = page.getByRole('button', { name: 'Reiniciar los pronósticos' });
    expect(await reinicios.count()).toBe(2);
    await reinicios.first().click();
    await page.getByRole('button', { name: 'Sí, borrar' }).click();
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

  test('el selector reparte exactamente los cupos que hay', async ({ page }) => {
    await page.goto('/calculadora');
    await page.getByRole('button', { name: 'Tabla anual' }).click();

    const columna = page.locator('table tbody tr td:nth-last-child(2)');
    /* Cinco mil temporadas en un Worker: con la suite entera en paralelo puede tardar. */
    await expect(columna.first()).not.toHaveText('—', { timeout: 40_000 });

    const suma = async () => {
      const textos = await columna.allTextContents();
      return textos.reduce((total, texto) => total + Number(texto.replace(/[^\d]/g, '')), 0);
    };

    /* Un campeón, cuatro cupos de Libertadores, cuatro de Sudamericana y dos que se van. */
    expect(await suma()).toBeGreaterThan(85);
    expect(await suma()).toBeLessThan(115);

    await page.getByRole('button', { name: 'Libertadores' }).click();
    expect(await suma()).toBeGreaterThan(370);
    expect(await suma()).toBeLessThan(430);

    await page.getByRole('button', { name: 'Descenso' }).click();
    expect(await suma()).toBeGreaterThan(180);
    expect(await suma()).toBeLessThan(220);
  });

  test('los botones de más y menos mueven el marcador', async ({ page }) => {
    await page.goto('/calculadora');
    const fila = page.locator('[data-partido-calculadora][data-editable]').first();
    await expect(fila).toBeVisible({ timeout: 15_000 });
    const celda = fila.locator('input').first();
    const mas = fila.getByRole('button', { name: /Un gol más/ }).first();
    const menos = fila.getByRole('button', { name: /Un gol menos/ }).first();

    await expect(menos).toBeDisabled();
    await mas.click();
    await mas.click();
    await expect(celda).toHaveValue('2');
    await menos.click();
    await expect(celda).toHaveValue('1');
  });

  test('la fase elegida manda en el calendario y en la tabla', async ({ page }) => {
    await page.goto('/calculadora');
    await expect(page.getByText(/Calendario · Clausura/i)).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Apertura', exact: true }).click();
    await expect(page.getByText(/Tabla · Apertura/i)).toBeVisible();
    await expect(page.getByText(/Calendario · Apertura/i)).toBeVisible();
    /* El Apertura está jugado: no queda nada por pronosticar en su calendario. */
    expect(await page.locator('[data-partido-calculadora][data-editable]').count()).toBe(0);
  });

  /*
   * El movimiento es el dato: quién subió y quién bajó. Si las filas saltan de golpe, el ojo pierde
   * a quién seguía, así que viajan a su nueva posición y solo se enciende la que cambió de puesto.
   */
  test('la tabla se reordena con animación y solo marca a los que se movieron', async ({ page }) => {
    await page.goto('/calculadora');
    await page.getByRole('button', { name: 'Tabla anual' }).click();
    await expect(page.locator('tbody [data-fila]').first()).toBeVisible({ timeout: 15_000 });

    await page.locator('[data-partido-calculadora][data-editable] input').first().fill('6');
    await page.waitForTimeout(120);

    const animaciones = await page.evaluate(() => {
      const filas = [...document.querySelectorAll('tbody [data-fila]')];
      const conRastro = filas.filter((fila) =>
        fila
          .getAnimations()
          .some((a) => (a.effect?.getKeyframes?.() ?? []).some((k) => 'backgroundColor' in k)),
      ).length;
      return { filas: filas.length, corriendo: filas.flatMap((f) => f.getAnimations()).length, conRastro };
    });

    expect(animaciones.corriendo).toBeGreaterThan(0);
    /* El rastro de color va solo en las que cambiaron de puesto, no en las que se corrieron. */
    expect(animaciones.conRastro).toBeGreaterThan(0);
    expect(animaciones.conRastro).toBeLessThan(animaciones.filas);
  });

  test('el modo streamer tapa la tabla y deja seguir cargando el escenario', async ({ page }) => {
    await page.goto('/calculadora');
    await expect(page.locator('tbody [data-fila]').first()).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: 'Modo streamer' }).click();
    await expect(page.getByText('Resultados ocultos')).toBeVisible();
    /* El calendario se queda: en una transmisión se sigue pronosticando con la tabla tapada. */
    await expect(page.locator('[data-partido-calculadora]').first()).toBeVisible();

    await page.getByRole('button', { name: 'Revelar la tabla' }).click();
    await expect(page.getByText('Resultados ocultos')).toBeHidden();
  });

  /*
   * El escenario vive en la URL y solo ahí. Volver al día siguiente y encontrarse los pronósticos
   * de la semana pasada —sobre partidos ya jugados— es peor que empezar limpio.
   */
  test('irse de la calculadora deja el escenario atrás', async ({ page }) => {
    await page.goto('/calculadora');
    const celda = page.locator('[data-partido-calculadora][data-editable] input').first();
    await expect(celda).toBeVisible({ timeout: 15_000 });
    await celda.fill('3');
    await expect(page).toHaveURL(/\?p=/, { timeout: 10_000 });

    await page.goto('/');
    await page.goto('/calculadora');
    await expect(page.locator('[data-partido-calculadora][data-editable] input').first()).toBeVisible(
      { timeout: 15_000 },
    );
    expect(page.url()).not.toContain('?p=');
    expect(await page.evaluate(() => Object.keys(window.localStorage).filter((k) => k.includes('calculadora')))).toEqual([]);
  });

  /*
   * La tarjeta y la vista previa del enlace salen de la misma frase: dos textos distintos para el
   * mismo escenario serían dos verdades.
   */
  test('la predicción se resume en una tarjeta y en la vista previa del enlace', async ({ page }) => {
    await page.goto('/calculadora');
    await expect(page.locator('[data-partido-calculadora][data-editable]').first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('[data-prediccion]')).toHaveCount(0);

    await page.locator('[data-partido-calculadora][data-editable] input').first().fill('3');
    await expect(page.locator('[data-prediccion]')).toBeVisible({ timeout: 10_000 });
    /* Sin la fase completa, el líder es puntero y no campeón: no se adorna un dato incompleto. */
    await expect(page.locator('[data-prediccion]')).toContainText(/puntero del/i);
    await expect(page.locator('[data-prediccion]')).toContainText(/Copa Libertadores/i);

    const html = await (await page.request.get(page.url())).text();
    expect(html).toContain('og:title" content="Mi predicción:');
  });

  test('un resultado ya jugado no se puede editar', async ({ page }) => {
    await page.goto('/calculadora');
    await expect(page.locator('[data-partido-calculadora]').first()).toBeVisible({
      timeout: 15_000,
    });
    const jugados = page.locator('[data-partido-calculadora]:not([data-editable])');
    expect(await jugados.count()).toBeGreaterThan(0);
    expect(await jugados.first().locator('input').count()).toBe(0);
  });
});
