import { expect, test } from '@playwright/test';

/*
 * Una partida dura sesenta segundos exactos y hay casos que la dejan terminar sola. El timeout es
 * generoso por eso y no porque el juego sea lento.
 */
test.describe.configure({ timeout: 180_000 });

const RUTA = '/juegos/60-segundos';

interface PreguntaServida {
  clave: string;
  opciones: Array<{ texto: string; esCorrecta: boolean }>;
}

/**
 * Arranca una partida y devuelve las respuestas tal como se las sirvieron a la página.
 *
 * Se leen de lo que pide el propio navegador y no de otra tanda: cada tanda viene barajada, así que
 * pedir una nueva para saber la respuesta acierta solo cuando la suerte repite el orden.
 */
async function jugar(pagina: import('@playwright/test').Page): Promise<Map<string, string>> {
  const buenas = new Map<string, string>();
  pagina.on('response', (res) => {
    if (!res.url().includes('/preguntas.json')) return;
    void res
      .json()
      .then((cuerpo: { preguntas: PreguntaServida[] }) => {
        for (const q of cuerpo.preguntas) {
          const buena = q.opciones.find((o) => o.esCorrecta);
          if (buena) buenas.set(q.clave, buena.texto);
        }
      })
      .catch(() => null);
  });

  await pagina.goto(RUTA);
  await pagina.getByRole('button', { name: 'Jugar' }).click();
  await expect(pagina.locator('[data-pregunta]')).toBeVisible({ timeout: 60_000 });
  return buenas;
}

/** La opción correcta de la pregunta en pantalla, y una equivocada. */
async function opciones(
  pagina: import('@playwright/test').Page,
  buenas: Map<string, string>,
): Promise<{ clave: string; buena: string; mala: string }> {
  const clave = (await pagina.locator('[data-pregunta]').getAttribute('data-pregunta')) ?? '';
  const buena = buenas.get(clave);
  expect(buena, `la pregunta ${clave} tiene que estar entre las servidas`).toBeTruthy();
  const mala = await pagina
    .locator('[data-opcion]')
    .evaluateAll((nodos, correcta) =>
      nodos.map((n) => n.getAttribute('data-opcion') ?? '').find((t) => t !== correcta) ?? '',
      buena,
    );
  return { clave, buena: buena ?? '', mala };
}

test.describe('60 Segundos', () => {
  test('el catálogo de juegos lleva al juego', async ({ page }) => {
    await page.goto('/juegos');
    await page.getByRole('link', { name: /60 Segundos/i }).click();

    await expect(page).toHaveURL(new RegExp(RUTA));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/60 Segundos/i);
  });

  test('el catálogo trae las cincuenta con una sola correcta cada una', async ({ page }) => {
    const respuesta = await page.request.get(`${RUTA}/preguntas.json`);
    const cuerpo = (await respuesta.json()) as { preguntas: PreguntaServida[] };

    expect(cuerpo.preguntas.length).toBeGreaterThanOrEqual(50);
    for (const q of cuerpo.preguntas) {
      expect(q.opciones.length).toBeGreaterThanOrEqual(2);
      expect(q.opciones.filter((o) => o.esCorrecta)).toHaveLength(1);
    }
    const claves = cuerpo.preguntas.map((q) => q.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  /*
   * Dieciséis de las cincuenta son «¿quién ganó tal torneo?»: barajando a secas, tres seguidas de
   * esa forma son lo normal y la partida se sentiría como un formulario.
   */
  test('dos preguntas seguidas nunca son del mismo tipo', async ({ page }) => {
    const respuesta = await page.request.get(`${RUTA}/preguntas.json`);
    const { preguntas } = (await respuesta.json()) as {
      preguntas: Array<{ tipo: string; clave: string }>;
    };

    const pegadas = preguntas.filter((q, i) => i > 0 && preguntas[i - 1]?.tipo === q.tipo);
    expect(pegadas.map((q) => q.clave)).toEqual([]);
  });

  test('acertar suma puntos y encadena la siguiente sola', async ({ page }) => {
    const buenas = await jugar(page);
    const { clave, buena } = await opciones(page, buenas);

    await page.locator(`[data-opcion="${buena}"]`).click();
    await expect(page.locator(`[data-opcion="${buena}"]`)).toHaveAttribute('data-estado', 'acertada');
    await expect(page.locator('[data-racha="1"]')).toBeVisible();
    /* La siguiente entra sola: encadenar no puede pedirle un clic a nadie. */
    await expect(page.locator('[data-pregunta]')).not.toHaveAttribute('data-pregunta', clave);

    const puntos = await page.locator('[data-puntos]').getAttribute('data-puntos');
    expect(Number(puntos)).toBeGreaterThan(0);
  });

  /* Es la diferencia con El Impostor: ahí un error te mata, acá solo te cuesta la racha. */
  test('fallar revela la correcta y la partida sigue', async ({ page }) => {
    const buenas = await jugar(page);
    const { clave, buena, mala } = await opciones(page, buenas);

    await page.locator(`[data-opcion="${mala}"]`).click();
    await expect(page.locator(`[data-opcion="${mala}"]`)).toHaveAttribute('data-estado', 'errada');
    await expect(page.locator(`[data-opcion="${buena}"]`)).toHaveAttribute('data-estado', 'revelada');

    await expect(page.locator('[data-pregunta]')).not.toHaveAttribute('data-pregunta', clave);
    await expect(page.locator('[data-resultado]')).toHaveCount(0);
  });

  test('el reloj cierra la partida solo y deja repasar los errores', async ({ page }) => {
    const buenas = await jugar(page);
    const { buena, mala } = await opciones(page, buenas);
    await page.locator(`[data-opcion="${mala}"]`).click();
    expect(buena).toBeTruthy();

    /* Sin tocar nada más: los sesenta segundos se acaban y la partida se cierra. */
    await expect(page.locator('[data-resultado]')).toBeVisible({ timeout: 90_000 });
    await page.getByRole('button', { name: /Repasar/i }).click();

    await expect(page.locator('[data-repaso]')).toBeVisible();
    await expect(page.getByText('Correcta')).toBeVisible();
  });

  test('el récord queda guardado y se ve al volver', async ({ page }) => {
    const buenas = await jugar(page);
    const { buena } = await opciones(page, buenas);
    await page.locator(`[data-opcion="${buena}"]`).click();

    await expect(page.locator('[data-resultado]')).toBeVisible({ timeout: 90_000 });

    await page.goto(RUTA);
    await expect(page.getByText('Mejor puntaje')).toBeVisible();
  });

  test('se puede jugar entero con el teclado', async ({ page }) => {
    const buenas = await jugar(page);
    const { buena } = await opciones(page, buenas);

    await page.locator(`[data-opcion="${buena}"]`).focus();
    await expect(page.locator(`[data-opcion="${buena}"]`)).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-racha="1"]')).toBeVisible();
  });
});
