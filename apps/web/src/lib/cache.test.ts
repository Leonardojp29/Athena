import { describe, expect, it } from 'vitest';
import { cachear, encabezadoDeCache, sinCache } from './cache';

/*
 * Vercel solo guarda una respuesta si el `Cache-Control` trae `s-maxage`, y sirve lo viejo mientras
 * revalida si además trae `stale-while-revalidate`. Un error de tipeo acá no rompe nada visible: la
 * página simplemente vuelve a renderizarse en cada visita.
 */
describe('el encabezado de caché', () => {
  it('declara las tres duraciones que el borde necesita', () => {
    expect(encabezadoDeCache('juego')).toBe(
      'public, max-age=300, s-maxage=86400, stale-while-revalidate=172800',
    );
    expect(encabezadoDeCache('partidoEnJuego')).toBe(
      'public, max-age=0, s-maxage=15, stale-while-revalidate=30',
    );
  });

  it('se escribe sobre la respuesta', () => {
    const respuesta = { headers: new Headers() };
    cachear(respuesta, 'competencia');
    expect(respuesta.headers.get('Cache-Control')).toBe(
      'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
    );
  });

  it('una respuesta sin caché no puede guardarse en ninguna capa', () => {
    const respuesta = { headers: new Headers() };
    cachear(respuesta, 'juego');
    sinCache(respuesta);
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store');
  });
});
