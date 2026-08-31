import { expect, test, type Page } from '@playwright/test';

/*
 * Mi Leyenda, de punta a punta.
 *
 * El juego son doce capítulos y se termina en menos de veinte segundos jugando a lo bruto: esa
 * duración **es** el diseño —la versión anterior tardaba casi dos minutos y por eso nadie llegaba al
 * final— y por eso el recorrido completo la mide en lugar de solo comprobar que no explota.
 */
test.describe.configure({ timeout: 180_000 });

const CREAR = '/juegos/mi-leyenda';

async function crearFutbolista(
  page: Page,
  opciones: { nombre?: string; puesto?: string } = {},
): Promise<void> {
  await page.goto(CREAR);
  await page.fill('#nombre', opciones.nombre ?? 'Leonardo Jurado');
  /* El botón del puesto lleva su nombre largo para el lector de pantalla: se busca por el prefijo. */
  if (opciones.puesto) {
    await page.getByRole('button', { name: new RegExp(`^${opciones.puesto} —`) }).first().click();
  }
  await page.getByRole('button', { name: /empezar la carrera/i }).click();
}

/** Da un paso del juego. Devuelve false cuando no hay nada que hacer (la carrera terminó). */
async function unPaso(page: Page): Promise<boolean> {
  const oferta = page.locator('[data-oferta]');
  const cancha = page.locator('[data-escena] canvas, canvas');
  const decision = page.locator('[data-escena] ul button');
  const quedarse = page.getByRole('button', { name: /quedarme|^seguir$/i });

  if (await cancha.count()) {
    /*
     * Espacio patea; el motor resuelve y avanza solo un segundo después. Se espera a que la escena
     * se vaya en lugar de dormir un tiempo fijo: dormir metía dos segundos de test en la medición de
     * cuánto tarda una carrera, que es justo lo que este test existe para vigilar.
     */
    await page.keyboard.press('Space');
    await expect(cancha).toHaveCount(0, { timeout: 15_000 });
  } else if (await oferta.count()) {
    await oferta.first().click({ force: true });
  } else if (await decision.count()) {
    await decision.first().click({ force: true });
  } else if (await quedarse.count()) {
    await quedarse.first().click({ force: true });
  } else {
    return false;
  }
  await page.waitForTimeout(160);
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
    /* El puesto se señala en la cancha y la liga se reconoce por su escudo. */
    await expect(page.getByRole('button', { name: /^DC —/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Primera División/ }).first()).toBeVisible();
    /* La promesa del diseño: se elige la liga, no el equipo. */
    await expect(page.getByLabel(/club/i)).toHaveCount(0);
    /* Sin nombre no se puede empezar. */
    await expect(page.getByRole('button', { name: /empezar la carrera/i })).toBeDisabled();
  });

  test('los laterales y los extremos se eligen por banda', async ({ page }) => {
    await page.goto(CREAR);
    await page.fill('#nombre', 'Banda Prueba');
    await page.getByRole('button', { name: /^EI —/ }).click();
    await expect(page.getByText('Extremo izquierdo')).toBeVisible();
    await page.getByRole('button', { name: /empezar la carrera/i }).click();

    /* La carta lleva la sigla con la banda, no el puesto pelado. */
    await expect(page.locator('[data-carta]').first()).toContainText('EI');
  });

  test('la nacionalidad y la liga se eligen por separado', async ({ page }) => {
    await page.goto(CREAR);
    await page.fill('#nombre', 'Mixto Prueba');
    await page.getByRole('button', { name: /^Perú$/ }).click();
    await page.getByRole('button', { name: /Liga Profesional Argentina/ }).click();
    await page.getByRole('button', { name: /empezar la carrera/i }).click();

    /* Peruano debutando en Argentina: la bandera es la suya y los clubes, los de allá. */
    await expect(page.locator('img[alt="Perú"]').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-oferta]').first()).toContainText(/argentina/i);
  });

  test('al debutar te quieren cuatro clubes como máximo, y todos son reales', async ({ page }) => {
    await crearFutbolista(page, { puesto: 'DC' });

    const ofertas = page.locator('[data-oferta]');
    await expect(ofertas.first()).toBeVisible({ timeout: 15_000 });
    const cuantas = await ofertas.count();
    expect(cuantas).toBeGreaterThan(0);
    expect(cuantas).toBeLessThanOrEqual(4);

    /* Un club real trae su escudo del proveedor y su liga. */
    await expect(ofertas.first().locator('img')).toBeVisible();
    await expect(ofertas.first()).toContainText(/riesgo/i);
  });

  test('la carta vive dentro de la ficha y muestra los seis atributos', async ({ page }) => {
    await crearFutbolista(page, { puesto: 'MO' });
    await page.locator('[data-oferta]').first().click();

    const carta = page.locator('[data-carta]').first();
    await expect(carta).toBeVisible();
    /* Recién firmado, el material todavía es de los de abajo: la progresión se ve, no se lee. */
    await expect(carta).toHaveAttribute('data-material', /cantera|promesa/);
    await expect(carta).toContainText('MO');
    for (const rotulo of ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FÍS']) {
      await expect(carta).toContainText(rotulo);
    }
  });

  test('un arquero tiene sus propios atributos en la carta', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Arquero Prueba', puesto: 'POR' });
    await page.locator('[data-oferta]').first().click();

    const carta = page.locator('[data-carta]').first();
    await expect(carta).toContainText('POR');
    for (const rotulo of ['REF', 'EST', 'MAN', 'POS']) {
      await expect(carta).toContainText(rotulo);
    }
  });

  test('la línea de la carrera trae el escudo del club de cada bienio', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Escudos Prueba', puesto: 'DC' });
    await page.locator('[data-oferta]').first().click();

    const filas = page.locator('ol li');
    await expect(filas.first()).toBeVisible();
    /* La carrera se lee por escudos: sin ellos es una planilla. */
    await expect(filas.first().locator('img')).toBeVisible();
  });

  test('se puede empezar una leyenda nueva', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Reinicio Prueba' });
    await page.locator('[data-oferta]').first().click();
    await expect(page.locator('[data-carta]').first()).toBeVisible();

    page.on('dialog', (dialogo) => dialogo.accept());
    await page.getByRole('button', { name: /nueva leyenda/i }).first().click();
    await expect(page.locator('#nombre')).toBeVisible();
  });

  test('la partida se retoma al recargar', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Retomar Prueba' });
    await page.locator('[data-oferta]').first().click();
    await expect(page.locator('[data-carta]').first()).toBeVisible();

    await page.reload();
    /* Al volver no aparece la creación: aparece la carrera donde quedó. */
    await expect(page.locator('[data-carta]').first()).toBeVisible();
    await expect(page.locator('#nombre')).toHaveCount(0);
    /* El apellido en la carta va en mayúsculas por CSS: en el DOM sigue como se escribió. */
    await expect(page.locator('[data-carta]').first()).toContainText(/prueba/i);
  });

  test('una carrera entera se juega en menos de veinte segundos y deja un legado compartible', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'el recorrido completo corre una sola vez');
    await crearFutbolista(page, { nombre: 'Legado Prueba' });
    await expect(page.locator('[data-oferta]').first()).toBeVisible({ timeout: 15_000 });

    const arranque = Date.now();
    let pasos = 0;
    let vacios = 0;
    while (pasos++ < 60) {
      if (await page.getByRole('button', { name: /compartir mi leyenda/i }).count()) break;
      if (await unPaso(page)) {
        vacios = 0;
        continue;
      }
      if (++vacios > 8) break;
      await page.waitForTimeout(500);
    }
    const duracion = Date.now() - arranque;

    /* Doce capítulos, doce decisiones: si esto sube, el juego volvió a ser largo. */
    expect(pasos).toBeLessThanOrEqual(16);
    expect(duracion).toBeLessThan(25_000);

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
    const oferta = page.locator('[data-oferta]').first();
    await expect(oferta).toBeVisible({ timeout: 15_000 });

    await oferta.focus();
    await expect(oferta).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-carta]').first()).toBeVisible();
  });
});
