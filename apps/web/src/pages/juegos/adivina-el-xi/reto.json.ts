import type { APIRoute } from 'astro';
import { api, ApiError, type RetoParaJugar } from '../../../lib/api';

/*
 * El reto de la partida, desde el mismo origen que la página. Sin caché: cada partida quiere uno
 * distinto, y guardarlo sería servirle el mismo a todo el que entre en los próximos minutos.
 */
export const GET: APIRoute = async ({ url }) => {
  const parametros = new URLSearchParams({
    catalogo: url.searchParams.get('catalogo') ?? 'internacional',
    dificultad: url.searchParams.get('dificultad') ?? 'normal',
    excluir: url.searchParams.get('excluir') ?? '',
  });

  try {
    const reto = await api<RetoParaJugar>(`/juegos/once/reto?${parametros}`);
    return Response.json(reto, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const status = error instanceof ApiError && error.status === 404 ? 404 : 503;
    return Response.json(
      { error: status === 404 ? 'sin retos para esa combinación' : 'no disponible' },
      { status, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
