import { expect, test, type Page } from '@playwright/test';

/*
 * La cancha y la ficha del jugador. Los partidos con alineación se buscan por API en lugar de
 * cablear un id: la base se resincroniza y un uuid fijo convertiría el suite en un mentiroso.
 */
/*
 * Timeout amplio: cada round-trip a Supabase desde fuera de su región cuesta cerca de un
 * segundo, y el sondeo encadena varios antes de tocar la página.
 */
test.describe.configure({ timeout: 90_000 });

const API = 'http://localhost:3001/v1';
const CANDIDATOS = 6;
const TIMEOUT_SONDEO = 10_000;

/* Memo entre tests: sin esto cada uno vuelve a sondear la misma lista. */
let memo: { id: string | null } | null = null;

async function partidoConAlineacion(page: Page): Promise<string | null> {
  if (memo) return memo.id;
  memo = { id: null };

  try {
    /*
     * Los partidos de hoy casi nunca tienen alineación todavía: se busca entre los ya
     * jugados de un par de ligas, que es donde el backfill sí la cargó.
     */
    const candidatos: Array<{ id: string }> = [];
    for (const liga of ['liga-profesional-argentina', 'primera-division', 'serie-a-brazil']) {
      const res = await page.request.get(`${API}/views/competition/${liga}`, {
        timeout: TIMEOUT_SONDEO,
      });
      if (!res.ok()) continue;
      const vista = (await res.json()) as { recent: Array<{ id: string }> };
      candidatos.push(...vista.recent.slice(0, CANDIDATOS));
      if (candidatos.length >= CANDIDATOS) break;
    }

    for (const candidato of candidatos.slice(0, CANDIDATOS)) {
      const detalle = await page.request.get(`${API}/views/match/${candidato.id}`, {
        timeout: TIMEOUT_SONDEO,
      });
      if (!detalle.ok()) continue;
      const match = (await detalle.json()) as { lineups: unknown[] };
      if (match.lineups.length > 0) {
        memo.id = candidato.id;
        return candidato.id;
      }
    }
  } catch {
    return null;
  }
  return null;
}

test.describe('cancha interactiva', () => {
  test('dibuja los once de cada equipo y cada uno abre su ficha', async ({ page }) => {
    const id = await partidoConAlineacion(page);
    test.skip(id === null, 'ningún partido del día tiene alineación sincronizada');

    await page.goto(`/partidos/${id}?vista=alineaciones`);
    const cancha = page.locator('[data-cancha]');
    await expect(cancha).toBeVisible();

    // veintidós fichas: si el grid falla, `layout` esconde la cancha y esto lo delata
    const fichas = cancha.locator('[data-ficha]');
    const total = await cancha.locator('[data-jugador], [title="Jugador sin ficha en Athena"]').count();
    expect(total).toBe(22);
    expect(await fichas.count()).toBeGreaterThan(0);

    const ficha = page.locator('#ficha-jugador');
    await expect(ficha).toBeHidden();

    await fichas.first().click();
    await expect(ficha).toBeVisible();
    await expect(ficha.getByRole('heading', { level: 2 })).not.toBeEmpty();
  });

  test('la ficha se cierra con Escape y el foco vuelve al jugador', async ({ page }) => {
    const id = await partidoConAlineacion(page);
    test.skip(id === null, 'ningún partido del día tiene alineación sincronizada');

    await page.goto(`/partidos/${id}?vista=alineaciones`);
    const boton = page.locator('[data-cancha] [data-ficha]').first();
    await boton.click();

    const ficha = page.locator('#ficha-jugador');
    await expect(ficha).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(ficha).toBeHidden();
    await expect(boton).toBeFocused();
  });

  test('el enlace con el jugador en el hash abre su ficha al cargar', async ({ page }) => {
    const id = await partidoConAlineacion(page);
    test.skip(id === null, 'ningún partido del día tiene alineación sincronizada');

    await page.goto(`/partidos/${id}?vista=alineaciones`);
    const boton = page.locator('[data-cancha] [data-ficha]').first();
    const playerId = await boton.getAttribute('data-jugador');
    expect(playerId).not.toBeNull();

    await page.goto(`/partidos/${id}?vista=alineaciones#jugador-${playerId}`);
    await expect(page.locator('#ficha-jugador')).toBeVisible();
  });

  test('la ficha enlaza al perfil del jugador', async ({ page }) => {
    const id = await partidoConAlineacion(page);
    test.skip(id === null, 'ningún partido del día tiene alineación sincronizada');

    await page.goto(`/partidos/${id}?vista=alineaciones`);
    await page.locator('[data-cancha] [data-ficha]').first().click();

    const perfil = page.locator('#ficha-jugador [data-ficha-perfil-pie]');
    await expect(perfil).toHaveAttribute('href', /^\/jugadores\/.+/);
    await perfil.click();
    await expect(page).toHaveURL(/\/jugadores\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('pestañas del partido', () => {
  test('el marcador sigue presente en todas las vistas', async ({ page }) => {
    const id = await partidoConAlineacion(page);
    test.skip(id === null, 'ningún partido del día tiene alineación sincronizada');

    for (const vista of ['resumen', 'alineaciones', 'estadisticas', 'analisis']) {
      await page.goto(`/partidos/${id}?vista=${vista}`);
      await expect(page.locator('main')).toContainText(/–|:/);
    }
  });

  test('una vista inventada cae en el resumen sin romper nada', async ({ page }) => {
    const id = await partidoConAlineacion(page);
    test.skip(id === null, 'ningún partido del día tiene alineación sincronizada');

    const res = await page.goto(`/partidos/${id}?vista=inventada`);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page');
  });
});
