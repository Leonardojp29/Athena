import { expect, test, type Page } from '@playwright/test';

/*
 * El espacio de los anuncios, siempre a un costado.
 *
 * Va en el margen y nunca partiendo el contenido: una tarjeta de anuncio metida entre dos secciones
 * interrumpe lo que la persona vino a leer, y eso no se compensa con impresiones.
 *
 * Todavía no hay red conectada, así que lo que se prueba no es qué se muestra sino que el espacio
 * esté reservado con su medida antes de que nada lo llene. Un hueco que aparece después empuja la
 * página mientras alguien lee, y eso es a la vez una molestia y una señal que el buscador castiga.
 */

/*
 * Dónde vive el costado de cada vista y desde qué ancho es de verdad un costado.
 *
 * La ficha del futbolista no está: ahí el riel dejaba un hueco muerto a la derecha y encogía la
 * tabla de la temporada, que es el bloque que manda el ancho de toda la página.
 */
const VISTAS: Array<[string, number]> = [
  ['/', 1280],
  /* El calendario tiene columna propia desde lg: su hueco no espera a los 1800. */
  ['/partidos', 1280],
  ['/competencias', 1900],
  ['/competencias/primera-division', 1600],
  ['/equipos/alianza-lima', 1280],
  ['/comparar', 1900],
];

const MEDIDAS: Record<string, [number, number]> = {
  riel: [300, 600],
  bloque: [300, 250],
};

const huecosVisibles = (page: Page) =>
  page.$$eval('[data-anuncio]', (nodos) =>
    nodos
      .map((n) => {
        const r = n.getBoundingClientRect();
        return {
          ubicacion: n.getAttribute('data-anuncio')!,
          medida: n.getAttribute('data-medida')!,
          ancho: Math.round(r.width),
          alto: Math.round(r.height),
        };
      })
      .filter((h) => h.ancho > 0),
  );

const sobra = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe('espacio para anuncios', () => {
  for (const [ruta, ancho] of VISTAS) {
    test(`${ruta} reserva su costado con la medida exacta`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 1000 });
      await page.goto(ruta);

      const huecos = await huecosVisibles(page);
      expect(huecos, `${ruta} a ${ancho}px debería reservar un costado`).toHaveLength(1);

      const [hueco] = huecos;
      const [anchoMax, altoExacto] = MEDIDAS[hueco!.medida]!;
      expect(hueco!.alto, `${ruta} · ${hueco!.ubicacion}`).toBe(altoExacto);
      expect(hueco!.ancho, `${ruta} · ${hueco!.ubicacion}`).toBeLessThanOrEqual(anchoMax);
      expect(await sobra(page), `${ruta} se va de lado`).toBeLessThanOrEqual(0);
    });
  }

  /*
   * Donde el costado es un riel de 19rem que se gana con el margen sobrante, se asoma recién a los
   * 1800: por debajo le robaría ancho al contenido.
   */
  test('el riel aparece desde 1800 px y no antes', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/competencias');
    expect(await huecosVisibles(page)).toHaveLength(0);

    await page.setViewportSize({ width: 1900, height: 900 });
    await page.goto('/competencias');
    expect((await huecosVisibles(page)).map((h) => h.medida)).toEqual(['riel']);
  });

  /*
   * En un teléfono no hay costados. Lo que no puede pasar es que el hueco se cuele en medio del
   * contenido ni que empuje la página a lo ancho.
   */
  test('en un teléfono nada se mete en el contenido ni se va de lado', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    for (const [ruta] of VISTAS) {
      await page.goto(ruta);
      expect(await sobra(page), ruta).toBeLessThanOrEqual(0);
    }
  });
});
