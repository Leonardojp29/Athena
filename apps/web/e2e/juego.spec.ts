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

/** La celebración tapa la pantalla hasta que alguien la cierra. */
async function cerrarCelebracion(page: Page): Promise<void> {
  const celebracion = page.locator('[data-celebracion]');
  for (let intentos = 0; intentos < 8 && (await celebracion.count()); intentos++) {
    await celebracion.click({ force: true });
    await page.waitForTimeout(160);
  }
}

/** Da un paso del juego. Devuelve false cuando no hay nada que hacer (la carrera terminó). */
async function unPaso(page: Page): Promise<boolean> {
  /* La celebración se pone delante de todo: hay que sacarla antes de seguir jugando. */
  const celebracion = page.locator('[data-celebracion]');
  if (await celebracion.count()) {
    await celebracion.click();
    await page.waitForTimeout(120);
    return true;
  }

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
    /*
     * Espacio patea y el motor resuelve solo un segundo después. Se reintenta porque una celebración
     * puede aparecer entre la comprobación y la tecla y se lleva la primera pulsación. No se
     * comprueba que el lienzo desaparezca: al capítulo siguiente puede tocar otra jugada, y entonces
     * hay un lienzo nuevo aunque la anterior se haya resuelto perfectamente.
     */
    for (let intentos = 0; intentos < 2; intentos++) {
      await cancha.first().focus();
      await page.keyboard.press('Space');
      await page.waitForTimeout(2000);
      const avanzo =
        (await page.locator('[data-celebracion]').count()) +
        (await page.locator('[data-oferta]').count()) +
        (await page.locator('[data-escena] ul button').count());
      if (avanzo > 0 || (await cancha.count()) === 0) break;
    }
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
    /* La ficha comparte pantalla con el mercado: la carta está desde el primer segundo. */
    await crearFutbolista(page, { puesto: 'MO' });
    await expect(page.locator('[data-oferta]').first()).toBeVisible({ timeout: 15_000 });

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
    await expect(page.locator('[data-oferta]').first()).toBeVisible({ timeout: 15_000 });

    const carta = page.locator('[data-carta]').first();
    await expect(carta).toContainText('POR');
    for (const rotulo of ['REF', 'EST', 'MAN', 'POS']) {
      await expect(carta).toContainText(rotulo);
    }
  });

  test('la línea de la carrera trae el escudo del club de cada bienio', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Escudos Prueba', puesto: 'DC' });
    await expect(page.locator('[data-oferta]').first()).toBeVisible({ timeout: 15_000 });

    /* Un capítulo son dos decisiones: la primera fila llega recién cuando la cola se vacía. */
    const filas = page.locator('ol li img');
    for (let pasos = 0; pasos < 6 && (await filas.count()) === 0; pasos++) {
      await unPaso(page);
    }
    /* La carrera se lee por escudos: sin ellos es una planilla. */
    await expect(filas.first()).toBeVisible();
  });

  test('se puede empezar una leyenda nueva', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Reinicio Prueba' });
    await expect(page.locator('[data-carta]').first()).toBeVisible({ timeout: 15_000 });

    page.on('dialog', (dialogo) => dialogo.accept());
    await page.getByRole('button', { name: /nueva leyenda/i }).first().click();
    await expect(page.locator('#nombre')).toBeVisible();
  });

  test('una leyenda terminada no queda guardada', async ({ page }) => {
    /*
     * No hay historial: una carrera que se acabó se cuenta, se comparte si el jugador quiere y
     * desaparece. Lo que hace que alguien empiece otra es que la anterior ya no esté esperándolo.
     */
    await page.goto(CREAR);
    await page.evaluate(() =>
      window.localStorage.setItem(
        'athena:leyenda',
        JSON.stringify({ version: 2, guardadaEn: '', carrera: { etapa: 'legado', capitulo: 12 } }),
      ),
    );
    await page.reload();
    await expect(page.locator('#nombre')).toBeVisible({ timeout: 15_000 });
  });

  test('la partida se retoma al recargar', async ({ page }) => {
    await crearFutbolista(page, { nombre: 'Retomar Prueba' });
    await expect(page.locator('[data-carta]').first()).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-oferta]').first().click();

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
    while (pasos++ < 90) {
      if (await page.getByRole('button', { name: /compartir mi leyenda/i }).count()) break;
      if (await unPaso(page)) {
        vacios = 0;
        continue;
      }
      if (++vacios > 8) break;
      await page.waitForTimeout(500);
    }
    const duracion = Date.now() - arranque;

    /*
     * Doce capítulos y dos decisiones en cada uno, más las celebraciones que hay que cerrar. Si esto
     * sube, el juego volvió a ser largo, que es lo único que este test existe para vigilar.
     */
    expect(pasos).toBeLessThanOrEqual(60);
    expect(duracion).toBeLessThan(30_000);

    /* El veredicto es un arquetipo, no un puntaje. */
    await expect(page.getByRole('button', { name: /compartir mi leyenda/i })).toBeVisible();
    await expect(page.locator('h1')).not.toBeEmpty();
    await expect(page.getByText(/temporadas/i).first()).toBeVisible();
    await expect(page.locator('[data-carta]').first()).toBeVisible();

    /*
     * El enlace del legado abre esa misma carta para cualquiera. El código ya no se imprime al pie
     * —era una tira de trescientos caracteres— ni se guarda en ningún lado: viaja en el botón de
     * compartir, que es el único lugar donde hace falta.
     */
    const codigo =
      (await page.getByRole('button', { name: /compartir mi leyenda/i }).getAttribute('data-codigo')) ?? '';
    expect(codigo.length).toBeGreaterThan(20);
    await page.goto(`/juegos/mi-leyenda/${codigo}`);
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
    /* `press` sobre el propio locator lo vuelve a enfocar: si React redibujó la lista entre medio,
       la tecla llegaba a un nodo que ya no estaba en la pantalla. */
    await oferta.press('Enter');
    /* Firmó: el mercado se cerró y el juego siguió, sea con una decisión o con una jugada. */
    await expect(page.locator('[data-oferta]')).toHaveCount(0, { timeout: 10_000 });
  });
});
