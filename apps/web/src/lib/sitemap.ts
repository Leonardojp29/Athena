/** Lo que comparten los sitemaps hijos: escapar, envolver y contestar. */

export interface Entrada {
  ruta: string;
  lastmod?: string | null;
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function comoXml(entradas: Entrada[], site: URL | undefined): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entradas
  .map(({ ruta, lastmod }) => {
    const loc = escapar(new URL(ruta, site).toString());
    const cuando = lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : '';
    return `  <url><loc>${loc}</loc>${cuando}</url>`;
  })
  .join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
