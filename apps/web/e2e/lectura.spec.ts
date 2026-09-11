import { expect, test } from '@playwright/test';

test.describe('recorrido de lectura', () => {
  /*
   * Desde la home, una liga se abre en su propio contenedor y de ahí se llega a la página completa.
   * Antes el nombre de la liga en los partidos del día iba directo a su ruta, que es justo lo que
   * hacía perder de vista el resto del día.
   */
  test('la home lista partidos y llega a una competencia en dos pasos', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/partidos/i);

    const liga = page.locator('main a[href^="/?liga="]').first();
    await expect(liga).toBeVisible();
    await liga.click();
    await expect(page).toHaveURL(/\?liga=/);

    const completa = page.getByRole('link', { name: /ver la liga completa/i });
    await expect(completa).toBeVisible();
    await completa.click();

    await expect(page).toHaveURL(/\/competencias\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('una competencia muestra su tabla y llega al perfil de un equipo', async ({ page }) => {
    await page.goto('/competencias/primera-division');
    await expect(page.getByRole('heading', { name: /tabla de posiciones/i })).toBeVisible();

    const firstTeam = page.locator('table a[href^="/equipos/"]').first();
    const teamName = (await firstTeam.textContent())?.trim() ?? '';
    await firstTeam.click();

    await expect(page).toHaveURL(/\/equipos\//);
    if (teamName) await expect(page.getByRole('heading', { level: 1 })).toContainText(teamName);
  });

  /*
   * Una copa no se lee como una liga: lo que se viene a ver es el cuadro —quién juega con quién y
   * quién pasó— y el once del torneo. Antes la página mostraba un grupo de cuatro equipos estirado
   * en toda la pantalla y la ronda en el inglés del proveedor.
   */
  test('una copa muestra su cuadro, su once del torneo y las rondas en español', async ({
    page,
  }) => {
    await page.goto('/competencias/conmebol-libertadores');

    await expect(page.getByRole('heading', { name: /camino al título/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /el once del torneo/i })).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/Round of|Quarter-finals|Semi-finals/i);

    /*
     * Cada llave abre el partido y cada nombre su equipo, y las dos cosas **dentro de la copa**: el
     * partido de los octavos de la Libertadores es de la Libertadores, así que su detalle se ve sin
     * salir de la competencia.
     */
    const cuadro = page.locator('section', {
      has: page.getByRole('heading', { name: /camino al título/i }),
    });
    expect(await cuadro.locator('a[href*="?partido="]').count()).toBeGreaterThan(4);
    expect(await cuadro.locator('a[href*="?equipo="]').count()).toBeGreaterThan(4);
    expect(
      await cuadro.locator('a[href^="/competencias/conmebol-libertadores?"]').count(),
    ).toBeGreaterThan(8);

    /*
     * El camino completo al título: la ronda en juego y las que faltan sortear. Una eliminatoria se
     * parte en dos cada vez, así que con los octavos en marcha ya se sabe que vienen cuartos, semis
     * y final aunque el proveedor no haya publicado un partido.
     */
    await expect(cuadro.getByText(/por definir/i).first()).toBeVisible();

    /*
     * Y el orden es dinámico: mientras se juega la fase final, el cuadro va antes que la fase de
     * grupos y que la fase previa. Antes las tres estaban en la misma fila, como si la fase previa 3
     * siguiera a los octavos.
     */
    const titulos = await page.locator('main h2').allInnerTexts();
    const posicion = (aguja: RegExp) => titulos.findIndex((t) => aguja.test(t));
    expect(posicion(/camino al título/i)).toBeGreaterThanOrEqual(0);
    expect(posicion(/camino al título/i)).toBeLessThan(posicion(/fase de grupos/i));
    expect(posicion(/fase de grupos/i)).toBeLessThan(posicion(/fase previa/i));
  });

  /*
   * La misma página, otra competencia y otro momento del calendario: la Champions recién empezó y
   * solo tiene fase previa, así que no hay cuadro que mostrar y no se inventa uno.
   */
  test('una copa que recién arranca muestra su fase previa y ningún cuadro', async ({ page }) => {
    await page.goto('/competencias/uefa-champions-league');

    const previa = page.getByRole('heading', { name: /fase previa/i }).first();
    test.skip((await previa.count()) === 0, 'esta temporada ya pasó la fase previa');

    await expect(previa).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/Qualifying Round|Play-offs/i);
  });

  /*
   * Leonardo abrió la Copa del Rey y encontró dos columnas "Final" —la de septiembre con diez llaves y
   * la de abril con una— y un cartel de "en juego" cuatro meses después del campeón. Las dos cosas eran
   * la misma raíz: el proveedor llama "1/128-finals" a la primera ronda y nadie miraba el calendario.
   */
  test('una copa terminada dice que terminó y no repite el nombre de una ronda', async ({ page }) => {
    await page.goto('/competencias/copa-del-rey');

    await expect(page.locator('main')).toContainText(/torneo terminado/i);

    const cuadro = page.locator('section', {
      has: page.getByRole('heading', { name: /camino al título/i }),
    });
    /* Ninguna ronda repetida y ninguna palabra que no se escribe. */
    const nombres = (await cuadro.locator('li > div > p:first-child').allInnerTexts()).map((t) =>
      t.split('\n')[0]!.trim(),
    );
    expect(nombres.length).toBeGreaterThan(4);
    expect(new Set(nombres).size).toBe(nombres.length);
    expect(nombres.join(' ')).not.toMatch(/treintaidosavos|dieciseisavos|sesentaicuatroavos/i);
    expect(nombres.join(' ')).toMatch(/32avos de final/i);
  });

  /*
   * Los partidos van en una sola tarjeta que se navega por ronda, abierta en la que se juega: antes eran
   * "próximos partidos" y "últimos resultados", el mismo calendario partido en dos y sin decir de qué
   * ronda era cada partido.
   */
  test('los partidos de una competencia se navegan por ronda', async ({ page }) => {
    await page.goto('/competencias/conmebol-libertadores');

    const partidos = page.locator('section', {
      has: page.getByRole('heading', { name: /^partidos$/i }),
    });
    await expect(partidos).toBeVisible();
    /* Abre en la ronda que se juega y la parte en ida y vuelta. */
    await expect(partidos.getByText(/octavos de final/i).first()).toBeVisible();
    await expect(partidos.getByText(/^vuelta$/i).first()).toBeVisible();

    const visibles = () => partidos.locator('[data-ronda-panel]:not([hidden])');
    const antes = await visibles().first().innerText();
    await partidos.getByRole('button', { name: 'Ronda anterior' }).click();
    await expect(visibles()).toHaveCount(1);
    expect(await visibles().first().innerText()).not.toBe(antes);
  });

  /*
   * La casa del club: el proveedor manda foto, aforo y superficie en el mismo endpoint de equipos que
   * ya se pedía, y se descartaban. La banda no se dibuja cuando el equipo no tiene estadio, que es
   * uno de cada siete.
   */
  test('la página de un equipo muestra su estadio', async ({ page }) => {
    await page.goto('/equipos/flamengo');

    const casa = page.getByRole('region', { name: /estadio de local/i });
    test.skip((await casa.count()) === 0, 'el proveedor no ubica a este equipo');

    await expect(casa).toContainText(/la casa/i);
    await expect(casa).toContainText(/maracan/i);
    /* El aforo con separador de miles y la superficie en español, nunca "grass". */
    await expect(casa).toContainText(/\d{2}[.,]\d{3}/);
    await expect(casa).not.toContainText(/grass|artificial turf/i);
  });

  test('un partido muestra su marcador', async ({ page }) => {
    await page.goto('/competencias/primera-division');
    /*
     * El primero que se ve, no el primero del documento: los partidos van por ronda y las rondas que
     * no se están jugando viven en paneles ocultos, con sus enlaces fuera del alcance de quien lee.
     */
    await page.locator('a[href^="/partidos/"]:visible').first().click();

    await expect(page).toHaveURL(/\/partidos\//);
    await expect(page.locator('main')).toContainText(/–|:/);
  });

  test('la búsqueda encuentra un equipo tolerando errores de tipeo', async ({ page }) => {
    await page.goto('/buscar');
    await page.getByRole('searchbox').last().fill('alianca');
    await page.keyboard.press('Enter');

    // Timeout amplio a propósito: en desarrollo cada consulta viaja a Supabase
    // (~800 ms por round-trip desde fuera de su región).
    await expect(page).toHaveURL(/q=alianca/, { timeout: 15_000 });
    await expect(page.locator('main')).toContainText(/Alianza/i, { timeout: 15_000 });
  });

  test('una entidad inexistente cae en el 404 propio', async ({ page }) => {
    await page.goto('/equipos/no-existe-este-equipo');
    await expect(page.locator('main')).toContainText(/no existe|404/i);
  });
});

test.describe('comparar', () => {
  /*
   * Comparar dos jugadores es media conversación de fútbol y los acumulados ya estaban en la base.
   * Todo va por la URL, así que la comparación es un enlace que se puede mandar.
   */
  test('dos jugadores quedan uno al lado del otro', async ({ page, request }) => {
    const busqueda = await (
      await request.get('http://localhost:3001/v1/search?q=valera&limit=6')
    ).json();
    const jugadores: Array<{ slug: string }> = busqueda.results.filter(
      (h: { type: string }) => h.type === 'player',
    );
    test.skip(jugadores.length < 1, 'no hay jugadores para comparar');

    await page.goto(`/comparar?tipo=jugador&a=${jugadores[0]!.slug}`);
    /* Con un solo lado, la página es el buscador del segundo. */
    await expect(page.getByRole('button', { name: /buscar/i })).toBeVisible();

    /* El segundo también sale del buscador: un slug escrito a mano se rompe cuando el jugador
       pasa a llamarse con su nombre completo, que es justo lo que hace el renombrado. */
    const otro = await (
      await request.get('http://localhost:3001/v1/search?q=castillo&limit=6')
    ).json();
    const segundo = otro.results.find((h: { type: string }) => h.type === 'player')?.slug as
      | string
      | undefined;
    test.skip(!segundo, 'no hay un segundo jugador para comparar');

    await page.goto(`/comparar?tipo=jugador&a=${jugadores[0]!.slug}&b=${segundo}`);
    const filas = page.locator('main section li');
    expect(await filas.count()).toBeGreaterThan(8);
    /* El que gana la fila queda marcado, y nunca los dos a la vez. */
    const primera = filas.first();
    expect(await primera.locator('.text-primary-ink').count()).toBeLessThan(2);
  });

  test('el perfil ofrece comparar', async ({ page }) => {
    await page.goto('/equipos/alianza-lima');
    const comparar = page.getByRole('link', { name: /comparar/i }).first();
    await expect(comparar).toBeVisible();
    await comparar.click();
    await expect(page).toHaveURL(/\/comparar\?tipo=equipo&a=alianza-lima/);
  });
});

test.describe('favoritos', () => {
  /* Sin cuentas: el favorito vive en el navegador y el aviso dice dónde quedó. */
  test('seguir un equipo guarda en el navegador y lo avisa', async ({ page }) => {
    await page.goto('/equipos/alianza-lima');

    const seguir = page.getByRole('button', { name: /seguir/i }).first();
    await expect(seguir).toHaveAttribute('aria-pressed', 'false');

    await seguir.click();
    await expect(seguir).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/en este navegador/i)).toBeVisible();
  });
});

test.describe('SEO y accesibilidad', () => {
  for (const path of ['/', '/competencias/primera-division', '/equipos/alianza-lima']) {
    test(`${path} tiene metadata completa y un solo h1`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveTitle(/Athena/);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /.+/);
      expect(await page.locator('h1').count()).toBe(1);
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    });
  }

  test('el tema se alterna y persiste entre recargas', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('html');
    const before = (await root.getAttribute('data-theme')) ?? '';

    await page.getByLabel('Cambiar tema').click();
    await page.reload();

    expect((await root.getAttribute('data-theme')) ?? '').not.toBe(before);
  });

  test('ninguna imagen queda sin alt', async ({ page }) => {
    await page.goto('/competencias/primera-division');
    expect(await page.locator('img:not([alt])').count()).toBe(0);
  });

  test('robots y sitemap responden', async ({ request }) => {
    expect((await request.get('/robots.txt')).status()).toBe(200);
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('<urlset');
  });
});
