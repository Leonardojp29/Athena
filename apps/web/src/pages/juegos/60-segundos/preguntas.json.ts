import type { APIRoute } from 'astro';
import { api, type PreguntaParaJugar } from '../../../lib/api';

/*
 * El catálogo entero, barajado, desde el mismo origen que la página. Sin caché: cada partida es un
 * sorteo distinto y guardarlo sería darle a todo el mundo el mismo orden.
 */
export const GET: APIRoute = async () => {
  try {
    const cuerpo = await api<{ preguntas: PreguntaParaJugar[] }>('/juegos/60-segundos/preguntas');
    return Response.json(cuerpo, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json(
      { error: 'no disponible' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
};
