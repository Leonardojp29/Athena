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

  test('un partido muestra su marcador', async ({ page }) => {
    await page.goto('/competencias/primera-division');
    await page.locator('a[href^="/partidos/"]').first().click();

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

    await page.goto(`/comparar?tipo=jugador&a=${jugadores[0]!.slug}&b=e-castillo`);
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

test.describe('sesión y favoritos', () => {
  /*
   * Seguir a un equipo ya no exige una cuenta: se guarda en el navegador y el aviso dice dónde
   * quedó, con la invitación a crear cuenta. Antes el botón decía "Entrar para seguir" y quien no
   * tenía cuenta no podía marcar nada.
   */
  test('sin sesión, seguir un equipo guarda en el navegador y lo avisa', async ({ page }) => {
    await page.goto('/equipos/alianza-lima');

    const seguir = page.getByRole('button', { name: /seguir/i }).first();
    await expect(seguir).toHaveAttribute('aria-pressed', 'false');

    await seguir.click();
    await expect(seguir).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/en este navegador/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /crear cuenta/i })).toBeVisible();
  });

  test('la página de login pide correo y contraseña', async ({ page }) => {
    await page.goto('/entrar');
    await expect(page.getByLabel(/correo/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('credenciales inválidas muestran un error legible, no una excepción', async ({ page }) => {
    await page.goto('/entrar');
    await page.getByLabel(/correo/i).fill('nadie@athena-test.invalid');
    await page.getByLabel(/contraseña/i).fill('claveIncorrecta123');
    await page.getByRole('button', { name: /iniciar sesión/i }).click();

    await expect(page.locator('main')).toContainText(/incorrectos|confirma|correo/i);
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
