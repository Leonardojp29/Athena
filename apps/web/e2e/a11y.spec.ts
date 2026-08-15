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
 * El peso de cada vista: lo que el navegador se baja de verdad, no lo que pesa el bundle.
 *
 * Los techos de acá abajo **no son el objetivo, son la deuda medida**: el HTML, el CSS y las fuentes
 * suman 150 KB, y todo lo demás son los escudos del proveedor, que pesan 38 KB de media —88 KB los
 * de competencia— para dibujarse a trece o cuarenta píxeles. En un teléfono la home baja 4,6 MB.
 *
 * Arreglarlo es bajarlos una vez y servirlos redimensionados, y eso es un trabajo aparte. Hasta que
 * se haga, estos números vigilan que no empeore: si una vista se pasa, algo nuevo se fue de escala.
 */
test.describe('peso de las páginas', () => {
  const TECHO_KB: Record<string, number> = {
    '/': 6000,
    '/competencias/primera-division': 1400,
    '/competencias': 7600,
    '/equipos/alianza-lima': 1500,
  };

  for (const [nombre, ruta] of VISTAS) {
    test(`${nombre} no engorda más de lo ya medido`, async ({ page }) => {
      let bytes = 0;
      page.on('response', (res) => {
        const largo = Number(res.headers()['content-length'] ?? 0);
        if (Number.isFinite(largo)) bytes += largo;
      });
      await page.goto(ruta, { waitUntil: 'networkidle' });
      const kb = Math.round(bytes / 1024);
      console.log(`${ruta}: ${kb} KB`);
      expect(kb).toBeLessThan(TECHO_KB[ruta] ?? 1500);
    });
  }
});
