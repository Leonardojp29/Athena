import { expect, test } from '@playwright/test';

/*
 * Hasta acá ninguno de los juegos tenía salida.
 *
 * Los tres escribían un «Volver a Juegos» que vivía solo en la rama de error 503, así que si el
 * juego cargaba —o sea, siempre— el enlace no se dibujaba nunca. La única vía era la pastilla
 * «Juegos» del header, que en cualquier `/juegos/*` se pintaba como «estás acá». Este caso existe
 * para que eso no vuelva a pasar en ninguno de los cuatro.
 */
const JUEGOS = [
  ['Mi Leyenda', '/juegos/mi-leyenda'],
  ['Adivina el XI', '/juegos/adivina-el-xi'],
  ['El Impostor', '/juegos/el-impostor'],
  ['60 Segundos', '/juegos/60-segundos'],
] as const;

test.describe('la salida de los juegos', () => {
  for (const [nombre, ruta] of JUEGOS) {
    test(`desde ${nombre} se vuelve al catálogo`, async ({ page }) => {
      await page.goto(ruta);

      const salida = page.getByRole('link', { name: 'Volver a juegos' });
      await expect(salida).toBeVisible({ timeout: 30_000 });

      await salida.click();
      await expect(page).toHaveURL(/\/juegos$/);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Juegos/i);
    });
  }
});
