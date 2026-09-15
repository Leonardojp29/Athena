import type { APIRoute } from 'astro';
import { api, type FutbolistaBuscado } from '../../../lib/api';
import { encabezadoDeCache } from '../../../lib/cache';

/* El buscador de la partida: se teclea mucho, así que el borde guarda cada consulta. */
export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length === 0) {
    return Response.json({ resultados: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const respuesta = await api<{ resultados: FutbolistaBuscado[] }>(
      `/juegos/once/jugadores?q=${encodeURIComponent(q)}`,
    );
    return Response.json(respuesta, {
      headers: { 'Cache-Control': encabezadoDeCache('buscadorDelJuego') },
    });
  } catch {
    /* Un buscador caído no rompe la partida: devuelve vacío y el jugador sigue escribiendo. */
    return Response.json({ resultados: [] }, { headers: { 'Cache-Control': 'no-store' } });
  }
};
