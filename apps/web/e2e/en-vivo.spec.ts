import { expect, test } from '@playwright/test';

interface Marcadores {
  generadoEn: string;
  live: number;
  partidos: Array<{
    id: string;
    status: string;
    statusDetail: string | null;
    elapsedMinutes: number | null;
    homeScore: number | null;
    awayScore: number | null;
    actualizadoEn: string;
  }>;
}

test.describe('el marcador en vivo', () => {
  test('la vista liviana trae solo lo que cambia mientras se juega', async ({ page }) => {
    const respuesta = await page.request.get('/marcadores.json');
    expect(respuesta.ok()).toBe(true);

    const cuerpo = (await respuesta.json()) as Marcadores;
    expect(cuerpo.generadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof cuerpo.live).toBe('number');

    for (const partido of cuerpo.partidos) {
      expect(Object.keys(partido).sort()).toEqual([
        'actualizadoEn',
        'awayScore',
        'elapsedMinutes',
        'homeScore',
        'id',
        'status',
        'statusDetail',
      ]);
    }

    const bytes = (await respuesta.body()).length;
    expect(bytes).toBeLessThan(20_000);
  });

  test('un gol nuevo aparece en la fila sin recargar', async ({ page }) => {
    await page.goto('/');
    const refrescador = page.locator('[data-refresco-marcadores]');
    if ((await refrescador.count()) === 0) {
      test.skip(true, 'no hay fútbol en juego ni por empezar en este momento');
    }

    const id = await page.locator('[data-partido]').first().getAttribute('data-partido');
    const conGol = (generadoEn: string): Marcadores => ({
      generadoEn,
      live: 1,
      partidos: [
        {
          id: id as string,
          status: 'in_play',
          statusDetail: '2H',
          elapsedMinutes: 67,
          homeScore: 7,
          awayScore: 1,
          actualizadoEn: generadoEn,
        },
      ],
    });

    await page.route('**/marcadores.json', (ruta) =>
      ruta.fulfill({ json: conGol('2099-01-01T00:00:00.000Z') }),
    );
    await page.reload();

    const fila = page.locator(`[data-partido="${id}"]`).first();
    await expect(fila.locator('[data-marcador], [data-marcador-lado]').first()).toContainText('7', {
      timeout: 20_000,
    });
    await expect(fila).toHaveAttribute('data-en-vivo', '');
    await expect(page.locator('[data-contador-vivo-texto]')).toHaveText('1 en vivo');
  });

  test('una respuesta más vieja no pisa a una más nueva', async ({ page }) => {
    await page.goto('/');
    if ((await page.locator('[data-refresco-marcadores]').count()) === 0) {
      test.skip(true, 'no hay fútbol en juego ni por empezar en este momento');
    }

    const id = (await page.locator('[data-partido]').first().getAttribute('data-partido')) as string;
    const marcador = (generadoEn: string, homeScore: number): Marcadores => ({
      generadoEn,
      live: 1,
      partidos: [
        {
          id,
          status: 'in_play',
          statusDetail: '2H',
          elapsedMinutes: 67,
          homeScore,
          awayScore: 0,
          actualizadoEn: generadoEn,
        },
      ],
    });

    let llamadas = 0;
    await page.route('**/marcadores.json', (ruta) => {
      llamadas += 1;
      ruta.fulfill({
        json: llamadas === 1 ? marcador('2099-01-01T00:00:10.000Z', 5) : marcador('2099-01-01T00:00:00.000Z', 2),
      });
    });
    await page.reload();

    const fila = page.locator(`[data-partido="${id}"]`).first();
    await expect(fila.locator('[data-marcador], [data-marcador-lado]').first()).toContainText('5', {
      timeout: 20_000,
    });
    await page.waitForTimeout(18_000);
    await expect(fila.locator('[data-marcador], [data-marcador-lado]').first()).not.toContainText('2');
  });
});
