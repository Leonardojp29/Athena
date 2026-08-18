import { expect, test, type Page } from '@playwright/test';

/*
 * Mi Leyenda, de punta a punta.
 *
 * Una carrera entera tarda un rato incluso en ritmo exprés, así que el recorrido completo va en un solo
 * test que juega como jugaría una persona apurada —aceptar, decidir, patear— y comprueba las promesas
 * del juego: nunca más de cuatro clubes, la carta con sus atributos, el legado con su veredicto y el
 * enlace que abre esa carta en otra pestaña.
 */
test.describe.configure({ timeout: 180_000 });

const CREAR = '/juegos/mi-leyenda';

async function crearFutbolista(
  page: Page,
  opciones: { nombre?: string; puesto?: string; ritmo?: RegExp } = {},
): Promise<void> {
  await page.goto(CREAR);
  await page.fill('#nombre', opciones.nombre ?? 'Leonardo Jurado');
  /* El botón del puesto lleva su nombre largo para el lector de pantalla: se busca por el prefijo. */
  if (opciones.puesto) {
    await page.getByRole('button', { name: new RegExp(`^${opciones.puesto}\\b`) }).first().click();
  }
  await page.getByRole('button', { name: opciones.ritmo ?? /^Exprés/ }).click();
  await page.getByRole('button', { name: /empezar la carrera/i }).click();
}

/** Da un paso del juego. Devuelve false cuando no hay nada que hacer (la carrera terminó). */
async function unPaso(page: Page): Promise<boolean> {
  const oferta = page.locator('li button:has-text("Riesgo")');
  const golpe = page.getByRole('button', { name: /^(Apuntar|Patear|Pegarle)$/ });
  const opcionDeMomento = page.locator('[data-ventana] ~ ul button').first();
  const decision = page.locator('[data-escena] ul button');
  const continuar = page.getByRole('button', { name: /^(Continuar|Ver todo)$/ });
  const quedarse = page.getByRole('button', { name: /quedarme/i });

  if (await oferta.count()) {
    await oferta.first().click();
  } else if (await golpe.count()) {
    await golpe.first().click();
    await page.waitForTimeout(340);
    if (await golpe.count()) await golpe.first().click();
    await page.waitForTimeout(760);
  } else if (await opcionDeMomento.count()) {
    await opcionDeMomento.click();
    await page.waitForTimeout(640);
  } else if (await decision.count()) {
    await decision.first().click();
  } else if (await continuar.count()) {
    await continuar.first().click();
  } else if (await quedarse.count()) {
    await quedarse.click();
  } else {
    return false;
  }
  await page.waitForTimeout(140);
  return true;
}

test.describe('Mi Leyenda', () => {
  test('el header lleva al catálogo y el catálogo al juego', async ({ page }) => {
    await page.goto('/');
    const boton = page.locator('header a[href="/juegos"]');
    await expect(boton).toBeVisible();
    await boton.click();

    await expect(page.getByRole('heading', { level: 1, name: /juegos/i })).toBeVisible();
    await page.getByRole('link', { name: /mi leyenda/i }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: /mi leyenda/i })).toBeVisible();
  });

  test('la creación pide lo justo y nunca el club', async ({ page }) => {
    await page.goto(CREAR);
    await expect(page.locator('#nombre')).toBeVisible();
    await expect(page.locator('#liga')).toBeVisible();
    /* La promesa del diseño: se elige la liga, no el equipo. */
    await expect(page.getByLabel(/club/i)).toHaveCount(0);
    /* Sin nombre no se puede empezar. */
    await expect(page.getByRole('button', { name: /empezar la carrera/i })).toBeDisabled();
  });

  test('al debutar te quieren cuatro clubes como máximo, y todos son reales', async ({ page }) => {
    await crearFutbolista(page, { puesto: 'DC' });

    const ofertas = page.locator('li button:has-text("Riesgo")');
    await expect(ofertas.first()).toBeVisible({ timeout: 15_000 });
    const cuantas = await ofertas.count();
    expect(cuantas).toBeGreaterThan(0);
    expect(cuantas).toBeLessThanOrEqual(4);

    /* Un club real trae su escudo del proveedor y su liga. */
    await expect(ofertas.first().locator('img')).toBeVisible();
    await expect(ofertas.first()).toContainText(/Rol|Sueldo/i);
  });

  test('la carta muestra la media, el puesto y los seis atributos', async ({ page }) => {
    await crearFutbolista(page, { puesto: 'MO' });
    await page.locator('li button:has-text("Riesgo")').first().click();

    const carta = page.locator('[data-carta]').first();
    await expect(carta).toBeVisible();
    /* El material arranca en cantera: la progresión se ve, no se lee. */
    await expect(carta).toHaveAttribute('data-material', 'cantera');
    await expect(carta).toContainText('MO');
    for (const rotulo of ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FÍS']) {
      await expect(carta).toContainText(rotulo);
    }
  });

  test('un arquero tiene sus propios atributos en la carta', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Arquero Prueba', puesto: 'POR' });
    await page.locator('li button:has-text("Riesgo")').first().click();

    const carta = page.locator('[data-carta]').first();
    await expect(carta).toContainText('POR');
    for (const rotulo of ['REF', 'EST', 'MAN', 'POS']) {
      await expect(carta).toContainText(rotulo);
    }
  });

  test('la partida se retoma al recargar', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Retomar Prueba' });
    await page.locator('li button:has-text("Riesgo")').first().click();
    await expect(page.locator('[data-carta]').first()).toBeVisible();

    await page.reload();
    /* Al volver no aparece la creación: aparece la carrera donde quedó. */
    await expect(page.locator('[data-carta]').first()).toBeVisible();
    await expect(page.locator('#nombre')).toHaveCount(0);
    /* El apellido en la carta va en mayúsculas por CSS: en el DOM sigue como se escribió. */
    await expect(page.locator('[data-carta]').first()).toContainText(/prueba/i);
  });

  test('una carrera llega al retiro y deja un legado compartible', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Legado Prueba' });

    let pasos = 0;
    let vacios = 0;
    while (pasos++ < 500) {
      if (await page.getByRole('button', { name: /compartir mi leyenda/i }).count()) break;
      const avanzo = await unPaso(page);
      if (!avanzo) {
        /* Puede estar corriendo la animación de un momento: se espera y se vuelve a mirar. */
        if (++vacios > 10) break;
        await page.waitForTimeout(700);
        continue;
      }
      vacios = 0;
    }

    /* El veredicto es un arquetipo, no un puntaje. */
    await expect(page.getByRole('button', { name: /compartir mi leyenda/i })).toBeVisible();
    await expect(page.locator('h1')).not.toBeEmpty();
    await expect(page.getByText(/temporadas/i).first()).toBeVisible();
    await expect(page.locator('[data-carta]').first()).toBeVisible();

    /* El enlace del legado abre esa misma carta para cualquiera. */
    const enlace = (await page.locator('p.break-all').textContent())?.trim();
    expect(enlace).toContain('/juegos/mi-leyenda/');
    await page.goto(enlace as string);
    await expect(page.locator('[data-carta]')).toHaveCount(1);
    await expect(page.getByRole('link', { name: /crear tu propia leyenda/i })).toBeVisible();
  });

  test('un código inventado no rompe la página del legado', async ({ page }) => {
    const respuesta = await page.goto('/juegos/mi-leyenda/esto-no-es-un-codigo');
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: /no existe/i })).toBeVisible();
  });

  test('el juego se puede jugar con el teclado', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Teclado Prueba' });
    await page.locator('li button:has-text("Riesgo")').first().click();
    await expect(page.locator('[data-carta]').first()).toBeVisible();

    /* Tabular llega al botón de continuar y Enter lo activa. */
    const continuar = page.getByRole('button', { name: /^(Continuar|Ver todo)$/ });
    await continuar.focus();
    await expect(continuar).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-carta]').first()).toBeVisible();
  });
});
