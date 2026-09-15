import { expect, test } from '@playwright/test';

/*
 * Una partida de Adivina el XI cuesta un viaje al API por reto y otro por búsqueda, contra una base
 * que está fuera de región. El timeout es generoso por eso y no porque el juego sea lento.
 */
test.describe.configure({ timeout: 120_000 });

const RUTA = '/juegos/adivina-el-xi';

/** Arranca una partida con las opciones que estén elegidas y espera a ver la cancha. */
async function jugar(pagina: import('@playwright/test').Page): Promise<void> {
  await pagina.goto(RUTA);
  await pagina.getByRole('button', { name: 'Jugar' }).click();
  await expect(pagina.locator('[data-cancha-once]')).toBeVisible({ timeout: 60_000 });
}

test.describe('Adivina el XI', () => {
  test('el catálogo de juegos lleva al juego', async ({ page }) => {
    await page.goto('/juegos');
    await page.getByRole('link', { name: /Adivina el XI/i }).click();

    await expect(page).toHaveURL(new RegExp(RUTA));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Adivina el XI/i);
  });

  test('la partida arranca con once casillas vacías y ninguna resuelta', async ({ page }) => {
    await jugar(page);

    await expect(page.locator('[data-casillero]')).toHaveCount(11);
    await expect(page.locator('[data-casillero][data-resuelto]')).toHaveCount(0);
  });

  /*
   * Lo que protege este caso es la regla del juego: si los nombres viajaran en el reto, cualquiera
   * los leería en las herramientas del navegador y no habría nada que adivinar.
   */
  test('el reto que viaja al navegador no trae los nombres', async ({ page }) => {
    const respuesta = await page.request.get(`${RUTA}/reto.json?catalogo=peruano&dificultad=facil`);
    const reto = (await respuesta.json()) as Record<string, unknown> & {
      casilleros: Array<Record<string, unknown>>;
    };

    expect(reto.casilleros).toHaveLength(11);
    for (const casillero of reto.casilleros) {
      expect(Object.keys(casillero).sort()).toEqual(['grid', 'puesto', 'ref']);
    }
  });

  /* El buscador no puede devolver posición, club ni nacionalidad: cada uno sería una pista regalada. */
  test('el buscador solo devuelve nombre e identidad', async ({ page }) => {
    const respuesta = await page.request.get(`${RUTA}/jugadores.json?q=cueva`);
    const { resultados } = (await respuesta.json()) as {
      resultados: Array<Record<string, unknown>>;
    };

    expect(resultados.length).toBeGreaterThan(0);
    for (const futbolista of resultados) {
      expect(Object.keys(futbolista).sort()).toEqual(['nombre', 'ref']);
    }
  });

  /*
   * El índice es lo que hace que buscar cueste milisegundos en vez del segundo que tarda la ida y
   * vuelta a la base. Que venga ordenado por fama es parte del contrato: el cliente usa la posición
   * como desempate, así que sin orden "ramos" deja de traer a Sergio Ramos.
   */
  test('el índice llega completo y ordenado por fama', async ({ page }) => {
    const respuesta = await page.request.get(`${RUTA}/indice.json`);
    const { jugadores } = (await respuesta.json()) as { jugadores: Array<[string, string]> };

    expect(jugadores.length).toBeGreaterThan(10_000);
    expect(jugadores[0]?.[1]).toBeTruthy();

    const primerCentenar = jugadores.slice(0, 100).map(([, nombre]) => nombre);
    expect(primerCentenar).toContain('Lionel Messi');
  });

  test('el buscador responde sin salir a la red', async ({ page }) => {
    await jugar(page);
    /* El índice baja durante la presentación; para cuando se juega, ya está en memoria. */
    await page.waitForTimeout(1500);

    const arranque = Date.now();
    await page.locator('#once-buscador').fill('messi');
    await expect(page.locator('#once-resultados li').first()).toBeVisible();
    expect(Date.now() - arranque).toBeLessThan(400);

    await expect(page.locator('#once-resultados li').first()).toContainText('Lionel Messi');
  });

  test('se puede jugar con el teclado, y un intento equivocado no resuelve nada', async ({ page }) => {
    await jugar(page);

    await page.locator('#once-buscador').fill('zzzzqqq');
    await page.waitForTimeout(1200);
    await expect(page.locator('#once-resultados li')).toHaveCount(0);

    await page.locator('#once-buscador').fill('messi');
    await expect(page.locator('#once-resultados li').first()).toBeVisible({ timeout: 30_000 });
    await page.keyboard.press('Enter');

    /* Acierte o no, el campo queda limpio y con el foco para escribir el siguiente. */
    await expect(page.locator('#once-buscador')).toHaveValue('');
    await expect(page.locator('#once-buscador')).toBeFocused();
  });

  test('la pista descubre una letra sin revelar al futbolista', async ({ page }) => {
    await jugar(page);

    await page.locator('[data-pista]').click();
    await page.locator('[data-casillero]').first().click();

    const letra = page.locator('[data-casillero]').first().locator('[data-pista-letra]');
    await expect(letra).toBeVisible({ timeout: 30_000 });
    await expect(letra).toHaveText(/^[A-ZÁÉÍÓÚÑ]$/);
    /* Una letra no es el futbolista: la casilla sigue sin resolverse. */
    await expect(page.locator('[data-casillero][data-resuelto]')).toHaveCount(0);
  });

  test('sin tiempo no hay reloj, y rendirse pide confirmación', async ({ page }) => {
    await page.goto(RUTA);
    await page.getByRole('button', { name: /Sin tiempo/ }).click();
    await page.getByRole('button', { name: 'Jugar' }).click();
    await expect(page.locator('[data-cancha-once]')).toBeVisible({ timeout: 60_000 });

    await expect(page.locator('[data-reloj]')).toHaveCount(0);

    await page.locator('[data-rendirse]').click();
    await expect(page.locator('[data-rendirse-confirmar]')).toBeVisible();
    await page.locator('[data-rendirse-confirmar]').click();

    await expect(page.locator('[data-resultado]')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: /Siguiente XI/ })).toBeVisible();
  });

  /*
   * La partida ganada, de punta a punta.
   *
   * El resultado tiene que aparecer en el acto: esperar a que llegue la solución dejaba casi un
   * segundo de pantalla quieta justo al ganar, y quien completó los once ya conoce los once nombres.
   * Por eso la solución se retrasa a propósito acá: si el resultado dependiera de ella, no llegaría.
   */
  test('completar el once gana la partida sin esperar a la solución', async ({ page }) => {
    let clave: string | null = null;
    page.on('response', (respuesta) => {
      if (respuesta.url().includes('reto.json') && respuesta.ok()) {
        void respuesta
          .json()
          .then((cuerpo: { clave?: string }) => (clave = cuerpo.clave ?? null))
          .catch(() => undefined);
      }
    });

    await jugar(page);
    await page.waitForTimeout(1500);
    expect(clave).not.toBeNull();

    const solucion = await page.request.get(`${RUTA}/solucion.json?clave=${clave}`);
    const { titulares } = (await solucion.json()) as {
      titulares: Array<{ ref: string; nombre: string }>;
    };

    /* A partir de acá la solución tarda: el final no puede depender de ella. */
    await page.route('**/solucion.json*', async (ruta) => {
      await new Promise((listo) => setTimeout(listo, 8000));
      await ruta.abort();
    });

    /*
     * Se prueba primero por el apellido, que es como busca cualquiera, y si ese no lo trae entre los
     * ocho se escribe el nombre completo. Lo que se verifica acá es ganar la partida; a qué altura
     * de la lista aparece cada uno lo cubre la prueba del orden.
     */
    const buscar = async (texto: string, ref: string): Promise<number> => {
      await page.locator('#once-buscador').fill(texto);
      await expect(page.locator('#once-resultados li').first()).toBeVisible({ timeout: 15_000 });
      const fotos = await page.$$eval('#once-resultados li button img', (nodos) =>
        nodos.map((n) => n.getAttribute('src') ?? ''),
      );
      return fotos.findIndex((src) => src.includes(`/${ref}.png`));
    };

    const apellido = (nombre: string): string => nombre.trim().split(/\s+/).pop() ?? nombre;
    for (const titular of titulares) {
      let cual = await buscar(apellido(titular.nombre), titular.ref);
      if (cual < 0) cual = await buscar(titular.nombre, titular.ref);
      expect(cual, `${titular.nombre} tiene que poder encontrarse`).toBeGreaterThanOrEqual(0);
      await page.locator('#once-resultados li').nth(cual).click();
    }

    await expect(page.locator('[data-resultado]')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('[data-resultado]')).toContainText('11/11');
    await expect(page.locator('[data-resultado]')).toContainText('Once de once');
  });

  test('contra reloj la barra se vacía', async ({ page }) => {
    await jugar(page);

    const barra = page.locator('[data-reloj] div div');
    const alEmpezar = await barra.evaluate((el) => getComputedStyle(el).transform);
    await page.waitForTimeout(3000);

    expect(await barra.evaluate((el) => getComputedStyle(el).transform)).not.toBe(alEmpezar);
  });
});
