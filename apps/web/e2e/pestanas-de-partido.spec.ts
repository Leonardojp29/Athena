import { expect, test, type Page } from '@playwright/test';

/*
 * Las pestañas del partido cambian de panel sin recargar.
 *
 * Antes cada pestaña era una navegación completa: el servidor rearmaba el partido entero y la
 * pantalla quedaba en blanco casi un segundo. Ahora los paneles ya están en el HTML y el clic solo
 * intercambia cuál se ve.
 *
 * El partido se busca por API en lugar de cablear un id: la base se resincroniza y un uuid fijo
 * convertiría el suite en un mentiroso.
 */
test.describe.configure({ timeout: 90_000 });

const API = 'http://localhost:3001/v1';
const TIMEOUT_SONDEO = 10_000;

let memo: { id: string | null } | null = null;

async function unPartido(page: Page): Promise<string | null> {
  if (memo) return memo.id;
  memo = { id: null };
  try {
    const res = await page.request.get(`${API}/views/home`, { timeout: TIMEOUT_SONDEO });
    if (!res.ok()) return null;
    const home = (await res.json()) as { sections?: Array<{ matches?: Array<{ id: string }> }> };
    memo.id = home.sections?.flatMap((s) => s.matches ?? [])[0]?.id ?? null;
  } catch {
    return null;
  }
  return memo.id;
}

test.describe('pestañas del partido', () => {
  test('cambiar de pestaña no recarga la página', async ({ page }) => {
    const id = await unPartido(page);
    test.skip(id === null, 'no hay partidos hoy');

    await page.goto(`/partidos/${id}`);
    const centro = page.locator('[data-centro-del-partido]');
    await expect(centro).toHaveAttribute('data-vista', 'resumen');

    /* Una marca que solo sobrevive si el documento es el mismo: si navegó, se pierde. */
    await page.evaluate(() => {
      (window as unknown as { sigueViva?: boolean }).sigueViva = true;
    });

    await page.locator('[data-vista-tab="historial"]').click();

    await expect(centro).toHaveAttribute('data-vista', 'historial');
    await expect(page.locator('[data-vista-panel="historial"]')).toBeVisible();
    await expect(page.locator('[data-vista-panel="resumen"]')).toBeHidden();
    expect(page.url()).toContain('vista=historial');
    expect(
      await page.evaluate(() => (window as unknown as { sigueViva?: boolean }).sigueViva),
    ).toBe(true);
  });

  test('el botón de atrás vuelve a la pestaña anterior', async ({ page }) => {
    const id = await unPartido(page);
    test.skip(id === null, 'no hay partidos hoy');

    await page.goto(`/partidos/${id}`);
    await page.locator('[data-vista-tab="historial"]').click();
    await expect(page.locator('[data-centro-del-partido]')).toHaveAttribute(
      'data-vista',
      'historial',
    );

    await page.goBack();
    await expect(page.locator('[data-centro-del-partido]')).toHaveAttribute(
      'data-vista',
      'resumen',
    );
    await expect(page.locator('[data-vista-panel="resumen"]')).toBeVisible();
  });

  test('un solo panel se ve a la vez', async ({ page }) => {
    const id = await unPartido(page);
    test.skip(id === null, 'no hay partidos hoy');

    await page.goto(`/partidos/${id}`);
    for (const vista of ['historial', 'resumen']) {
      await page.locator(`[data-vista-tab="${vista}"]`).click();
      const visibles = await page.locator('[data-vista-panel]:not([hidden])').count();
      expect(visibles, `con ${vista} abierta`).toBe(1);
    }
  });
});

/*
 * El enlace sigue siendo un enlace: sin JavaScript navega y el servidor sirve el panel pedido.
 * Es lo que mantiene la página indexable y compartible.
 */
test.describe('pestañas del partido sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('cada pestaña se sirve desde el servidor', async ({ page }) => {
    const id = await unPartido(page);
    test.skip(id === null, 'no hay partidos hoy');

    await page.goto(`/partidos/${id}?vista=historial`);
    await expect(page.locator('[data-vista-panel="historial"]')).toBeVisible();
    await expect(page.locator('[data-vista-panel="resumen"]')).toBeHidden();
  });
});
