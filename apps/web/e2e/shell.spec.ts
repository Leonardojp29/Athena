import { expect, test } from '@playwright/test';

const RUTAS = ['/', '/partidos', '/competencias', '/competencias/primera-division'];

test.describe('shell del sitio', () => {
  test('la navegación se arma de datos y llega al catálogo completo', async ({ page, isMobile }) => {
    await page.goto('/');

    const header = page.locator('header');
    if (isMobile) {
      await page.getByLabel('Abrir menú').click();
      await header.getByRole('link', { name: 'Competencias', exact: true }).click();
    } else {
      await header.locator('nav details[data-menu] summary').click();
      await page.getByRole('link', { name: /ver todas las competencias/i }).click();
    }

    await expect(page).toHaveURL(/\/competencias$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/competencias/i);
    // el catálogo real pasa los cuarenta torneos; con menos, la nav cayó al respaldo cableado
    expect(await page.locator('a[href^="/competencias/"]').count()).toBeGreaterThan(30);
  });

  /*
   * El orden es la mitad del pedido: continente, después país, después torneo. Si alguna vez
   * alguien vuelve a agrupar por liga a secas, esto lo dice antes que una captura.
   */
  test('el catálogo se lee continente → país → torneo', async ({ page }) => {
    await page.goto('/competencias');

    const continentes = page.locator('main h2');
    const titulos = await continentes.allInnerTexts();
    expect(titulos.length).toBeGreaterThanOrEqual(4);
    expect(titulos[0]).toMatch(/sudam[eé]rica/i);

    // dentro del primer continente, países con su bandera y sus torneos
    const primerPais = page.locator('main section section').first();
    await expect(primerPais.locator('h3')).not.toBeEmpty();
    expect(await primerPais.locator('a[href^="/competencias/"]').count()).toBeGreaterThan(0);
  });

  test('la home agrupa los partidos del día por continente y país', async ({ page }) => {
    await page.goto('/');
    const grupos = page.locator('main details > summary h3');
    expect(await grupos.count()).toBeGreaterThan(0);

    // una sola columna: los continentes se apilan, no se reparten en tres
    const primero = await grupos.first().boundingBox();
    const ultimo = await grupos.last().boundingBox();
    if (primero && ultimo && (await grupos.count()) > 1) {
      expect(Math.abs(primero.x - ultimo.x)).toBeLessThan(4);
    }
  });

  test('el índice de partidos navega entre días', async ({ page }) => {
    await page.goto('/partidos');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/partidos/i);

    await page.getByLabel('Día anterior').click();
    await expect(page).toHaveURL(/\/partidos\?fecha=\d{4}-\d{2}-\d{2}/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('una fecha inválida no rompe la página', async ({ page }) => {
    const res = await page.goto('/partidos?fecha=maniana');
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  /*
   * El marcador lleva `view-transition-name`, y eso lo promueve a su propia capa: sin
   * pointer-events-none esa capa tapa el enlace estirado y el centro de cada fila deja de ser
   * clickeable. Es invisible a ojo y se rompe con una clase de menos.
   */
  test('el centro de una fila de partido es clickeable, no solo los bordes', async ({ page }) => {
    await page.goto('/partidos');
    const marcador = page.locator('main [data-marcador], main a[href^="/partidos/"]').first();
    await expect(marcador).toBeAttached();

    const fila = page.locator('main a[href^="/partidos/"]').first();
    const caja = await fila.boundingBox();
    expect(caja).not.toBeNull();

    // clic en el centro geométrico: justo donde vive el marcador
    await page.mouse.click(caja!.x + caja!.width / 2, caja!.y + caja!.height / 2);
    // timeout amplio: la vista de partido arma la cancha y viaja a Supabase
    await expect(page).toHaveURL(/\/partidos\/[0-9a-f-]{36}/, { timeout: 20_000 });
  });

  test('el pie enlaza competencias en todas las páginas', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Partidos' })).toBeVisible();
    expect(await footer.locator('a[href^="/competencias/"]').count()).toBeGreaterThan(2);
  });
});

test.describe('iconografía', () => {
  /*
   * Los emojis se usaban como iconos y se veían distintos en cada sistema operativo.
   * Este test es el que impide que vuelvan sin que nadie lo note.
   */
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

  for (const ruta of RUTAS) {
    test(`${ruta} no usa emojis como iconos`, async ({ page }) => {
      await page.goto(ruta);
      const texto = await page.locator('body').innerText();
      const halladas = [...texto].filter((c) => EMOJI.test(c));
      expect(halladas, `emojis encontrados: ${halladas.join(' ')}`).toHaveLength(0);
    });
  }

  test('los iconos heredan color del tema en lugar de fijar un hex', async ({ page }) => {
    await page.goto('/');
    const conHex = await page
      .locator('svg [stroke^="#"], svg [fill^="#"], svg[stroke^="#"], svg[fill^="#"]')
      .count();
    expect(conHex).toBe(0);
  });
});
