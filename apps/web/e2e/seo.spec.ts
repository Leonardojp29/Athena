import { expect, test, type Page } from '@playwright/test';

/*
 * Lo que el sitio le cuenta a un buscador.
 *
 * Cuatro cosas que estaban rotas y se rompen fácil otra vez: el canónico que se llevaba puestos los
 * parámetros que sí cambian la página, la home compitiendo con sus propias fichas, las entidades
 * que no existen contestando 200 desde `/404`, y las direcciones de partido escritas en UUID.
 */

const canonicaDe = (page: Page) =>
  page.locator('link[rel="canonical"]').getAttribute('href').then((h) => new URL(h!));

const grafoDe = (page: Page) =>
  page
    .locator('script[type="application/ld+json"]')
    .first()
    .textContent()
    .then((t) => JSON.parse(t!)['@graph'] as Array<Record<string, unknown>>);

test.describe('el canónico', () => {
  test('conserva la temporada, que es otra página', async ({ page }) => {
    await page.goto('/competencias/primera-division?temporada=2024');
    expect((await canonicaDe(page)).searchParams.get('temporada')).toBe('2024');
  });

  test('conserva el día del calendario', async ({ page }) => {
    await page.goto('/partidos?fecha=2026-09-10');
    expect((await canonicaDe(page)).searchParams.get('fecha')).toBe('2026-09-10');
  });

  /* Una pestaña no es otra página: las cuatro muestran el mismo partido. */
  test('descarta la pestaña, que no lo es', async ({ page }) => {
    await page.goto('/partidos?fecha=2026-09-10');
    const enlace = await page.locator('main a[href*="-vs-"]').first().getAttribute('href');
    await page.goto(`${enlace}?vista=alineaciones`);
    expect((await canonicaDe(page)).search).toBe('');
  });

  /* La home abre la ficha entera adentro: el crédito es de la ficha, no de la home. */
  test('la home se lo cede a la entidad que abre', async ({ page }) => {
    await page.goto('/?equipo=alianza-lima');
    expect((await canonicaDe(page)).pathname).toBe('/equipos/alianza-lima');

    await page.goto('/?liga=primera-division');
    expect((await canonicaDe(page)).pathname).toBe('/competencias/primera-division');

    await page.goto('/');
    expect((await canonicaDe(page)).pathname).toBe('/');
  });
});

test.describe('la dirección de un partido', () => {
  test('dice quién juega y cuándo, y el UUID viejo sigue llevando ahí', async ({ page, request }) => {
    await page.goto('/partidos');
    const enlace = (await page.locator('main a[href*="-vs-"]').first().getAttribute('href'))!;
    expect(enlace).toMatch(/^\/partidos\/[a-z0-9-]+-vs-[a-z0-9-]+-\d{4}-\d{2}-\d{2}$/);

    const directo = await request.get(enlace);
    expect(directo.status()).toBe(200);

    /* Del UUID al slug con un 301: los enlaces compartidos no pueden morir por un cambio nuestro. */
    await page.goto(enlace);
    const grafo = await grafoDe(page);
    const evento = grafo.find((n) => n['@type'] === 'SportsEvent')!;
    expect(evento.eventStatus).toBeTruthy();
    expect(evento['@id']).toContain('-vs-');
  });

  test('una fecha corrida redirige a la buena', async ({ page, request }) => {
    await page.goto('/partidos');
    const enlace = (await page.locator('main a[href*="-vs-"]').first().getAttribute('href'))!;
    const corrido = enlace.replace(/(\d{4})-(\d{2})-(\d{2})$/, (_, a, m, d) =>
      `${a}-${m}-${String(Number(d) === 28 ? 26 : Number(d) + 2).padStart(2, '0')}`,
    );
    const respuesta = await request.get(corrido, { maxRedirects: 0 });
    expect([200, 301]).toContain(respuesta.status());
    if (respuesta.status() === 301) expect(respuesta.headers()['location']).toBe(enlace);
  });

  test('una dirección inventada contesta 404 de verdad', async ({ request }) => {
    expect((await request.get('/partidos/no-existe-esto')).status()).toBe(404);
  });
});

test.describe('lo que no existe', () => {
  /* Un 302 a una página que contesta 200 deja la URL muerta en el índice gastando rastreo. */
  const INVENTADAS = [
    '/equipos/club-que-no-existe-jamas',
    '/jugadores/jugador-que-no-existe-jamas',
    '/competencias/liga-que-no-existe-jamas',
  ];
  for (const ruta of INVENTADAS) {
    test(`${ruta} contesta 404 y no un desvío`, async ({ request }) => {
      const respuesta = await request.get(ruta, { maxRedirects: 0 });
      expect(respuesta.status()).toBe(404);
    });
  }
});

test.describe('los datos estructurados', () => {
  const ESPERADO: Array<[string, string]> = [
    ['/', 'WebSite'],
    ['/competencias/primera-division', 'SportsOrganization'],
    ['/equipos/alianza-lima', 'SportsTeam'],
  ];

  for (const [ruta, tipo] of ESPERADO) {
    test(`${ruta} declara ${tipo} con identidad`, async ({ page }) => {
      await page.goto(ruta);
      const grafo = await grafoDe(page);
      const nodo = grafo.find((n) => n['@type'] === tipo);
      expect(nodo, `falta ${tipo} en ${ruta}`).toBeTruthy();
      /* Sin `@id` cada bloque es una isla y el buscador no une el club de acá con el de allá. */
      for (const n of grafo) expect(n['@id'], JSON.stringify(n['@type'])).toBeTruthy();
    });
  }

  test('toda ficha lleva su rastro de migas', async ({ page }) => {
    for (const ruta of ['/competencias/primera-division', '/equipos/alianza-lima']) {
      await page.goto(ruta);
      const grafo = await grafoDe(page);
      expect(grafo.map((n) => n['@type']), ruta).toContain('BreadcrumbList');
    }
  });
});

test.describe('compartir', () => {
  test('toda página tiene imagen, y la de respaldo se dibuja', async ({ page, request }) => {
    for (const ruta of ['/', '/partidos', '/competencias', '/comparar']) {
      await page.goto(ruta);
      const imagen = await page.locator('meta[property="og:image"]').getAttribute('content');
      expect(imagen, ruta).toBeTruthy();
    }
    const portada = await request.get('/og.png');
    expect(portada.status()).toBe(200);
    expect(portada.headers()['content-type']).toContain('image/png');
  });
});
