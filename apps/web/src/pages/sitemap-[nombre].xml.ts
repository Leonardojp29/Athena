import type { APIRoute } from 'astro';
import { api } from '../lib/api';
import { comoXml, type Entrada } from '../lib/sitemap';

/*
 * Los sitemaps hijos: `/sitemap-equipos.xml`, `/sitemap-partidos-1.xml`. El nombre lleva el tipo y,
 * cuando hace falta, la página. El índice de `/sitemap.xml` los enumera.
 */

const TIPOS = new Set(['competencias', 'equipos', 'jugadores', 'partidos']);

/* Las rutas fijas del sitio. No salen de la base, así que se escriben acá y se acabó. */
const PAGINAS: Entrada[] = [
  { ruta: '/' },
  { ruta: '/competencias' },
  { ruta: '/partidos' },
  { ruta: '/calculadora-liga-1' },
  { ruta: '/juegos' },
  { ruta: '/juegos/mi-leyenda' },
  { ruta: '/juegos/adivina-el-xi' },
];

export const GET: APIRoute = async ({ params, site }) => {
  const nombre = params.nombre ?? '';
  if (nombre === 'paginas') return comoXml(PAGINAS, site);

  const partido = /^([a-z]+)(?:-(\d+))?$/.exec(nombre);
  const tipo = partido?.[1] ?? '';
  if (!partido || !TIPOS.has(tipo)) return new Response(null, { status: 404 });

  const pagina = Number(partido[2] ?? 0);
  const entradas = await api<Entrada[]>(`/views/sitemap/${tipo}?pagina=${pagina}`).catch(
    () => [] as Entrada[],
  );
  return comoXml(entradas, site);
};
