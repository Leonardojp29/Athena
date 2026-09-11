import { gzipSync } from 'node:zlib';
import type { MiddlewareHandler } from 'astro';

/*
 * Comprimir las respuestas del servidor.
 *
 * El adaptador de Node no comprime nada, y se notaba: la home de un equipo son 444 KB de HTML que
 * viajan en 41 KB al comprimirlos —una décima parte—. Es la mejora más grande por línea escrita de
 * todo el producto, y no depende de dónde se despliegue: si adelante hay un CDN que ya comprime,
 * este middleware se aparta al ver el `content-encoding` puesto.
 *
 * Se comprime en memoria y no en flujo, así que en Vercel ni se intenta: su CDN ya comprime y
 * bufferizar ahí solo retrasa el primer byte.
 */
const COMPRIMIBLE = /^(?:text\/|application\/(?:json|javascript|xml)|image\/svg)/;

/* Por debajo de un kilobyte el encabezado pesa más que lo que se ahorra. */
const MINIMO = 1024;

export const onRequest: MiddlewareHandler = async (context, next) => {
  if (process.env.VERCEL) return next();

  const response = await next();

  if (!(context.request.headers.get('accept-encoding') ?? '').includes('gzip')) return response;
  if (response.headers.get('content-encoding')) return response;
  if (!COMPRIMIBLE.test(response.headers.get('content-type') ?? '')) return response;
  /* Sin cuerpo no hay nada que comprimir: un 204 o un redirect. */
  if (response.status === 204 || response.status === 304 || !response.body) return response;

  const crudo = new Uint8Array(await response.arrayBuffer());
  if (crudo.byteLength < MINIMO) {
    return new Response(crudo, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }

  const comprimido = gzipSync(crudo);
  const headers = new Headers(response.headers);
  headers.set('content-encoding', 'gzip');
  headers.set('content-length', String(comprimido.byteLength));
  headers.append('vary', 'accept-encoding');

  return new Response(comprimido, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
