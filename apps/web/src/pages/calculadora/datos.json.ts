import type { APIRoute } from 'astro';

/* El sondeo del marcador en vivo se mudó con su página; una pestaña abierta desde antes no falla. */
export const GET: APIRoute = ({ url }) =>
  new Response(null, {
    status: 301,
    headers: { location: `/calculadora-liga-1/datos.json${url.search}` },
  });
