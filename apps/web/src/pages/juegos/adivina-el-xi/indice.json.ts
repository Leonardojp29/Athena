import type { APIRoute } from 'astro';
import { api, type IndiceDeFutbolistas } from '../../../lib/api';
import { encabezadoDeCache } from '../../../lib/cache';

/*
 * El índice con el que el navegador busca sin salir a la red.
 *
 * Es la pieza que hace que escribir un nombre cueste milisegundos en lugar del segundo que tarda la
 * ida y vuelta a una base que está en otra región. Se baja una vez —mientras corre la presentación
 * del reto— y el navegador lo guarda un día, así que la segunda partida no lo vuelve a pedir.
 */
export const GET: APIRoute = async () => {
  try {
    const indice = await api<IndiceDeFutbolistas>('/juegos/once/indice');
    return Response.json(indice, {
      headers: { 'Cache-Control': encabezadoDeCache('indiceDelJuego') },
    });
  } catch {
    /* Sin índice el buscador sigue andando contra el servidor, solo que más lento. */
    return Response.json(
      { jugadores: [] },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
