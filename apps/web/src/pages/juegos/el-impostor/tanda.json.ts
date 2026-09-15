import type { APIRoute } from 'astro';
import { api, type RondaDelImpostor } from '../../../lib/api';

/*
 * Las diez rondas de la tanda, desde el mismo origen que la página. Sin caché: cada tanda es un
 * sorteo distinto y guardarla sería darle a todo el mundo las mismas rondas en el mismo orden.
 */
export const GET: APIRoute = async ({ url }) => {
  const excluir = url.searchParams.get('excluir') ?? '';

  try {
    const tanda = await api<{ rondas: RondaDelImpostor[] }>(
      `/juegos/impostor/tanda?excluir=${encodeURIComponent(excluir)}`,
    );
    return Response.json(tanda, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { error: 'no disponible' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
