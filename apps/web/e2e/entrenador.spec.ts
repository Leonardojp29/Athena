import { expect, test } from '@playwright/test';

/*
 * La ficha del entrenador.
 *
 * Athena guardaba el nombre del DT desde el primer día y lo imprimía como texto muerto en tres
 * pantallas. Lo que se protege acá es que ahora sea una persona: que tenga página, que sus números
 * sumen, y que desde un partido se pueda llegar a ella.
 */

test.describe('la página del entrenador', () => {
  test('el balance del banco cuadra con los partidos dirigidos', async ({ page }) => {
    await page.goto('/entrenadores/guardiola');

    const banco = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'En el banco' }) });
    await expect(banco).toBeVisible();

    const cifras: Record<string, number> = Object.fromEntries(
      await banco.locator('dl > div').evaluateAll((nodos) =>
        nodos.map((nodo) => [
          nodo.querySelector('dt')?.textContent?.trim() ?? '',
          Number(nodo.querySelector('dd')?.textContent ?? 0),
        ]),
      ),
    );

    expect(cifras.Dirigidos).toBeGreaterThan(0);
    expect((cifras.Ganados ?? 0) + (cifras.Empatados ?? 0) + (cifras.Perdidos ?? 0)).toBe(
      cifras.Dirigidos,
    );
  });

  test('la carrera enlaza a los clubes que dirigió', async ({ page }) => {
    await page.goto('/entrenadores/guardiola');

    const carrera = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Carrera' }) });
    await expect(carrera.locator('li')).not.toHaveCount(0);
    await expect(carrera.getByRole('link').first()).toHaveAttribute('href', /^\/equipos\//);
  });

  /* Un slug que se corrigió no puede dejar muerto el enlace que alguien compartió. */
  test('un slug que ya no existe no devuelve una página en blanco', async ({ page }) => {
    const respuesta = await page.goto('/entrenadores/no-existe-este-entrenador');
    expect(respuesta?.status()).toBe(404);
  });
});

test('desde la alineación de un partido se llega al entrenador', async ({ page }) => {
  await page.goto('/?equipo=manchester-city');

  const alDt = page.getByRole('link').filter({ hasText: /Guardiola|Maresca/ }).first();
  await expect(alDt).toHaveAttribute('href', /^\/entrenadores\//);
  await alDt.click();

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Guardiola|Maresca/i);
});

test('la cabecera del club dice quién lo dirige', async ({ page }) => {
  await page.goto('/equipos/manchester-city');

  const alDt = page.getByRole('link', { name: /^DT / });
  await expect(alDt).toHaveAttribute('href', /^\/entrenadores\//);
});

test('el buscador general encuentra al entrenador', async ({ page }) => {
  await page.goto('/buscar?q=guardiola');

  const grupo = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Entrenadores' }) });
  await expect(grupo).toBeVisible();
  await expect(grupo.getByRole('link', { name: /Guardiola/ }).first()).toHaveAttribute(
    'href',
    /^\/entrenadores\//,
  );
});
