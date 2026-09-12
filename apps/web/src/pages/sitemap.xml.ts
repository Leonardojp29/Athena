import type { APIRoute } from 'astro';

/*
 * El índice de sitemaps.
 *
 * Un solo archivo no alcanza: entre competencias, equipos, jugadores y partidos hay más de cien mil
 * direcciones y el formato tope en cincuenta mil por archivo. Acá van los hijos, uno por tipo, y
 * cada uno se pagina solo.
 */

const HIJOS = ['competencias', 'equipos', 'jugadores', 'partidos'] as const;
/* Con qué generosidad se ofrecen páginas de más: una vacía es barata, una faltante es invisible. */
const PAGINAS = { competencias: 1, equipos: 1, jugadores: 2, partidos: 2 } as const;

export const GET: APIRoute = ({ site }) => {
  const hoy = new Date().toISOString();
  const mapas = HIJOS.flatMap((tipo) =>
    Array.from({ length: PAGINAS[tipo] }, (_, pagina) =>
      new URL(`/sitemap-${tipo}${pagina > 0 ? `-${pagina}` : ''}.xml`, site).toString(),
    ),
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['/sitemap-paginas.xml', ...mapas]
  .map((loc) => new URL(loc, site).toString())
  .map((loc) => `  <sitemap><loc>${loc}</loc><lastmod>${hoy}</lastmod></sitemap>`)
  .join('\n')}
</sitemapindex>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
};
