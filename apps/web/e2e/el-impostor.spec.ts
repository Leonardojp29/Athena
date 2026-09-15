import { expect, test } from '@playwright/test';

/*
 * Cada partida cuesta al menos un viaje al API contra una base fuera de región, y la largada se
 * lleva tres segundos por diseño. El timeout es generoso por eso y no porque el juego sea lento.
 */
test.describe.configure({ timeout: 120_000 });

const RUTA = '/juegos/el-impostor';

interface RondaServida {
  clave: string;
  opciones: Array<{ ref: string; esImpostor: boolean }>;
}

/**
 * Arranca una partida y devuelve las rondas tal como se las sirvieron a la página.
 *
 * Se leen de la respuesta que pide el propio navegador y no de una tanda nueva: cada tanda es un
 * sorteo distinto, así que pedir otra para averiguar quién es el impostor acierta solo cuando la
 * suerte repite la ronda. Con esto, saber la respuesta no depende del azar.
 */
async function jugar(pagina: import('@playwright/test').Page): Promise<RondaServida[]> {
  const servidas: RondaServida[] = [];
  pagina.on('response', (res) => {
    if (!res.url().includes('/tanda.json')) return;
    void res
      .json()
      .then((cuerpo: { rondas: RondaServida[] }) => servidas.push(...cuerpo.rondas))
      .catch(() => null);
  });

  await pagina.goto(RUTA);
  await pagina.getByRole('button', { name: 'Jugar' }).click();
  await expect(pagina.locator('[data-carta]')).toHaveCount(6, { timeout: 60_000 });
  return servidas;
}

/** La carta del impostor de la ronda que está en pantalla. */
async function impostorDe(
  pagina: import('@playwright/test').Page,
  servidas: RondaServida[],
): Promise<string> {
  const clave = await pagina.locator('[data-ronda]').getAttribute('data-ronda');
  const ronda = servidas.find((r) => r.clave === clave);
  expect(ronda, `la ronda ${clave} tiene que estar entre las servidas`).toBeDefined();
  const impostor = ronda?.opciones.find((o) => o.esImpostor)?.ref;
  expect(impostor).toBeTruthy();
  return impostor ?? '';
}

test.describe('El Impostor', () => {
  test('el catálogo de juegos lleva al juego', async ({ page }) => {
    await page.goto('/juegos');
    await page.getByRole('link', { name: /El Impostor/i }).click();

    await expect(page).toHaveURL(new RegExp(RUTA));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/El Impostor/i);
  });

  test('la tanda trae diez rondas de seis cartas con un solo impostor', async ({ page }) => {
    const respuesta = await page.request.get(`${RUTA}/tanda.json`);
    const cuerpo = (await respuesta.json()) as {
      rondas: Array<{
        clave: string;
        enunciado: string;
        reveal: string;
        opciones: Array<Record<string, unknown>>;
      }>;
    };

    expect(cuerpo.rondas).toHaveLength(10);
    for (const ronda of cuerpo.rondas) {
      expect(ronda.opciones).toHaveLength(6);
      expect(ronda.opciones.filter((o) => o.esImpostor)).toHaveLength(1);
      /* Club, puesto o país en la carta serían pistas regaladas: la respuesta no los trae. */
      for (const opcion of ronda.opciones) {
        expect(Object.keys(opcion).sort()).toEqual(['esImpostor', 'nombre', 'ref']);
      }
    }
    /* Dos rondas iguales en la misma tanda serían la misma pregunta dos veces. */
    const claves = cuerpo.rondas.map((r) => r.clave);
    expect(new Set(claves).size).toBe(claves.length);
  });

  /*
   * La web memoriza las respuestas del API por treinta segundos para no repetir viajes a Supabase.
   * El sorteo viaja con `no-store` justamente para quedar fuera de eso: sin respetarlo, todo el que
   * entrara en la misma media hora jugaba las mismas diez rondas en el mismo orden.
   */
  test('dos tandas seguidas no son la misma', async ({ page }) => {
    const claves = async (): Promise<string> => {
      const r = await page.request.get(`${RUTA}/tanda.json`);
      const cuerpo = (await r.json()) as { rondas: Array<{ clave: string }> };
      return cuerpo.rondas.map((x) => x.clave).join(',');
    };

    expect(await claves()).not.toBe(await claves());
  });

  test('acertar encadena la ronda siguiente y sube la racha', async ({ page }) => {
    const servidas = await jugar(page);

    const impostor = await impostorDe(page, servidas);
    const primera = await page.locator('[data-ronda]').getAttribute('data-ronda');
    await page.locator(`[data-carta="${impostor}"]`).click();

    await expect(page.locator('[data-aviso="acertada"]')).toBeVisible();
    await expect(page.locator('[data-racha="1"]')).toBeVisible();
    /* La ronda siguiente llega sola: encadenar no puede pedirle un clic a nadie. */
    await expect(page.locator('[data-ronda]')).not.toHaveAttribute('data-ronda', primera ?? '');
    await expect(page.locator('[data-carta]')).toHaveCount(6);
  });

  test('fallar revela al impostor y termina la partida', async ({ page }) => {
    const servidas = await jugar(page);

    const impostor = await impostorDe(page, servidas);
    const equivocada = await page
      .locator(`[data-carta]:not([data-carta="${impostor}"])`)
      .first()
      .getAttribute('data-carta');
    await page.locator(`[data-carta="${equivocada}"]`).click();

    await expect(page.locator('[data-aviso="fallada"]')).toBeVisible();
    await expect(page.locator(`[data-carta="${impostor}"]`)).toHaveAttribute('data-apagada', 'false');
    await expect(page.locator('[data-desenlace="fallada"]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-racha-final="0"]')).toBeVisible();
  });

  test('quedarse sin tiempo cierra la racha sin que nadie toque nada', async ({ page }) => {
    await jugar(page);

    /* Veinte segundos de ronda más lo que dura el revelado: el reloj cierra solo. */
    await expect(page.locator('[data-aviso="sin-tiempo"]')).toBeVisible({ timeout: 35_000 });
    await expect(page.locator('[data-desenlace="sin-tiempo"]')).toBeVisible({ timeout: 15_000 });
  });

  test('el récord queda guardado y se ve al volver', async ({ page }) => {
    const servidas = await jugar(page);

    const impostor = await impostorDe(page, servidas);
    await page.locator(`[data-carta="${impostor}"]`).click();
    await expect(page.locator('[data-racha="1"]')).toBeVisible();

    /* Dejar acá cierra la partida con la racha que lleve, que es lo que se guarda. */
    await page.getByRole('button', { name: 'Dejar acá' }).click();
    await expect(page.locator('[data-racha-final="1"]')).toBeVisible({ timeout: 15_000 });

    /* Y sigue ahí al volver a entrar, que es lo único que hace que la racha valga algo. */
    await page.goto(RUTA);
    await expect(page.getByText('Mejor racha')).toBeVisible();
    await expect(page.locator('[data-inicio]')).toContainText('1');
  });

  test('se puede jugar entero con el teclado', async ({ page }) => {
    const servidas = await jugar(page);

    const impostor = await impostorDe(page, servidas);
    await page.locator(`[data-carta="${impostor}"]`).focus();
    await expect(page.locator(`[data-carta="${impostor}"]`)).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-aviso="acertada"]')).toBeVisible();
  });
});
