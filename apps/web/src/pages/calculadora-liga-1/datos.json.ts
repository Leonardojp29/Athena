import type { APIRoute } from 'astro';
import { api } from '../../lib/api';

/*
 * El mismo origen, para que el navegador no dependa del CORS del API y la respuesta se guarde en
 * el borde de este proyecto. Solo lo llama la calculadora mientras hay un partido en curso.
 */
export const GET: APIRoute = async () => {
  try {
    const datos = await api<{ partidos: unknown[]; hayEnVivo: boolean }>(
      '/views/calculadora/primera-division',
    );
    return new Response(JSON.stringify(datos), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch {
    return new Response('null', {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
};
