import { expect, test } from '@playwright/test';

test.describe('recorrido de lectura', () => {
  test('la home lista partidos y permite entrar a una competencia', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/partidos/i);

    const firstCompetition = page.locator('main a[href^="/competencias/"]').first();
    await expect(firstCompetition).toBeVisible();
    await firstCompetition.click();

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
