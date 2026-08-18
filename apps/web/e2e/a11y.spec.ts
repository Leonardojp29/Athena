import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/*
 * Accesibilidad y peso, medidos donde vive la gente.
 *
 * No es una pasada de conciencia: en un producto que se lee de un vistazo —un marcador, una tabla,
 * una cancha— el contraste y el orden del foco son la diferencia entre entender y adivinar. Y el
 * peso importa porque la mitad de esto se abre en el teléfono mientras se juega el partido.
 *
 * Se falla solo por violaciones serias o críticas: las menores se leen en el informe y se deciden,
 * pero no pueden trabar una suite que corre en cada cambio.
 */
const GRAVES = new Set(['serious', 'critical']);

/*
 * Más tiempo que el resto de la suite. Auditar una página con una isla hidratada —el juego— cuesta
 * varios segundos de análisis, y con los 150 tests corriendo en paralelo los 30 s por omisión se
 * agotaban por contención de la máquina y no por un problema de la página.
 */
test.describe.configure({ timeout: 90_000 });

async function auditar(page: Page, ruta: string) {
  await page.goto(ruta, { waitUntil: 'networkidle' });
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const graves = violations.filter((v) => GRAVES.has(v.impact ?? ''));
  if (graves.length > 0) {
    console.error(
      `${ruta}\n` +
        graves
          .map((v) => `  · ${v.id} (${v.impact}) en ${v.nodes.length}: ${v.help}\n    ${v.nodes[0]?.target.join(' ')}`)
          .join('\n'),
    );
  }
  return graves;
}

/* Una por vista y no todas en una prueba: así el informe dice cuál se rompió. */
const VISTAS: Array<[string, string]> = [
  ['la home', '/'],
  ['una competencia', '/competencias/primera-division'],
  ['el catálogo', '/competencias'],
  ['un equipo', '/equipos/alianza-lima'],
  ['el catálogo de juegos', '/juegos'],
  ['la creación de Mi Leyenda', '/juegos/mi-leyenda'],
];

test.describe('accesibilidad', () => {
  for (const [nombre, ruta] of VISTAS) {
    test(`${nombre} no tiene violaciones graves`, async ({ page }) => {
      expect(await auditar(page, ruta)).toEqual([]);
    });
  }

  test('un partido no tiene violaciones graves', async ({ page, request }) => {
    const dia = await (await request.get('http://localhost:3001/v1/views/home')).json();
    const id = dia.sections?.[0]?.matches?.[0]?.id as string | undefined;
    test.skip(!id, 'no hay partidos hoy');
    expect(await auditar(page, `/partidos/${id}`)).toEqual([]);
  });
});

/*
 * El peso de cada vista, separado en dos: lo que escribimos nosotros y lo que manda el proveedor.
 *
 * El presupuesto se pone sobre el documento, el CSS, las fuentes y el JavaScript —150 KB en toda la
 * página— porque es lo único que una regresión nuestra puede engordar. Las imágenes se miden y se
 * informan, pero no se afirman: son los escudos del proveedor, 38 KB de media para dibujarse a
 * veinte píxeles, y su número sube o baja con cuántos partidos se juegan hoy. Ponerlos en el
 * presupuesto convertía la prueba en un semáforo que se pone rojo por un domingo con más fútbol.
 *
 * Bajarlos una vez y servirlos redimensionados es un trabajo aparte; hasta que se haga, esta prueba
 * deja el número escrito en cada corrida.
 */
test.describe('peso de las páginas', () => {
  const TECHO_PROPIO_KB = 260;
  /*
   * El juego tiene su propio techo, y más alto: es una aplicación con estado, no una vista de lectura.
   * Ahí el JavaScript no es un impuesto sobre el contenido —es el contenido—, así que se le mide con su
   * propia vara en lugar de dejarlo fuera del presupuesto, que sería no medirlo.
   *
   * El número está medido sin comprimir, que es como el servidor de desarrollo sirve los assets: de los
   * 475 KB de hoy, 182 son React y 114 la isla del juego, y en producción salen comprimidos a menos de
   * un tercio. El techo deja unos 45 KB de margen: si el juego se come eso, hay que dividir la isla y no
   * subir el número.
   */
  const TECHO_DEL_JUEGO_KB = 520;
  const techoDe = (ruta: string) => (ruta.startsWith('/juegos') ? TECHO_DEL_JUEGO_KB : TECHO_PROPIO_KB);

  for (const [nombre, ruta] of VISTAS) {
    test(`${nombre} no engorda lo que escribimos nosotros`, async ({ page }) => {
      let propio = 0;
      let imagenes = 0;
      page.on('response', (res) => {
        const largo = Number(res.headers()['content-length'] ?? 0);
        if (!Number.isFinite(largo)) return;
        if (res.request().resourceType() === 'image') imagenes += largo;
        else propio += largo;
      });
      await page.goto(ruta, { waitUntil: 'networkidle' });
      console.log(
        `${ruta}: ${Math.round(propio / 1024)} KB nuestros · ${Math.round(imagenes / 1024)} KB de imágenes del proveedor`,
      );
      expect(Math.round(propio / 1024)).toBeLessThan(techoDe(ruta));
    });
  }
});
