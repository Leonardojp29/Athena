import type { APIRoute } from 'astro';
import { api, type TitularRevelado } from '../../../lib/api';
import { encabezadoDeCache } from '../../../lib/cache';

/* Los once con nombre y cara. Se pide al terminar la partida o al pedir la primera pista. */
export const GET: APIRoute = async ({ url }) => {
  const clave = (url.searchParams.get('clave') ?? '').trim();
  if (!/^[a-z-]+-\d+$/.test(clave)) {
    return Response.json({ error: 'clave inválida' }, { status: 400 });
  }

  try {
    const respuesta = await api<{ titulares: TitularRevelado[] }>(
      `/juegos/once/reto/${clave}/solucion`,
    );
    return Response.json(respuesta, {
      headers: { 'Cache-Control': encabezadoDeCache('solucionDelJuego') },
    });
  } catch {
    return Response.json(
      { error: 'no disponible' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
