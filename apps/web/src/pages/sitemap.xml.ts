import type { APIRoute } from 'astro';
import { api } from '../lib/api';

interface SitemapEntries {
  competitions: Array<{ slug: string }>;
  teams: Array<{ slug: string; updatedAt: string }>;
  players: Array<{ slug: string }>;
}

export const GET: APIRoute = async ({ site }) => {
  const { competitions, teams, players } = await api<SitemapEntries>('/views/sitemap');

  const urls = [
    { loc: new URL('/', site).toString(), priority: '1.0' },
    { loc: new URL('/juegos', site).toString(), priority: '0.8' },
    { loc: new URL('/juegos/mi-leyenda', site).toString(), priority: '0.8' },
    ...competitions.map((c) => ({
      loc: new URL(`/competencias/${c.slug}`, site).toString(),
      priority: '0.9',
    })),
    ...teams.map((t) => ({ loc: new URL(`/equipos/${t.slug}`, site).toString(), priority: '0.7' })),
    ...players.map((p) => ({
      loc: new URL(`/jugadores/${p.slug}`, site).toString(),
      priority: '0.6',
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u.loc}</loc><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
  });
};
