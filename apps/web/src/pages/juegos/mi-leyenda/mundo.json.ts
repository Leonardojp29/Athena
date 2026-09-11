import type { APIRoute } from 'astro';
import type { Mundo } from '@athena/leyenda';
import { api } from '../../../lib/api';
import { encabezadoDeCache } from '../../../lib/cache';

/*
 * Los clubes del juego, servidos desde el mismo origen que la página: así el navegador no depende
 * del CORS del API y la respuesta se guarda en el borde de este proyecto.
 */
export const GET: APIRoute = async () => {
  try {
    const mundo = await api<Mundo>('/views/mundo');
    return Response.json(mundo, {
      headers: { 'Cache-Control': encabezadoDeCache('clubesDelJuego') },
    });
  } catch {
    return Response.json(
      { error: 'mundo no disponible' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
