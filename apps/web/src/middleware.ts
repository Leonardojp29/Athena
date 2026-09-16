import { gzipSync } from 'node:zlib';
import type { MiddlewareHandler } from 'astro';
import { API_URL, MEDIA_URL } from './lib/entorno';

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

/*
 * Las cabeceras de seguridad, que van en todas las respuestas y en todos los despliegues.
 *
 * Viven acá y no en `vercel.json` porque el mismo sitio corre en Vercel, en un servidor propio con
 * el adaptador de Node y detrás de CloudFront: una configuración por plataforma se olvida en dos de
 * las tres.
 *
 * Sobre la CSP, para que nadie la lea como algo que no es: `script-src` lleva `'unsafe-inline'`
 * porque Astro emite los scripts de las pestañas y el buscador en línea, así que esta política no
 * defiende contra XSS. Lo que sí hace, y es real: nadie puede meter la página en un iframe, ni
 * cambiarle la base de las URL, ni cargar un plugin, ni mandar un formulario afuera, ni traer una
 * imagen o abrir una conexión a un origen que no esté en esta lista. Con Astro 6 se puede pasar a
 * hashes y quitar el `'unsafe-inline'`.
 */
const POLITICA_DE_CONTENIDO = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `img-src 'self' data: ${MEDIA_URL}`,
  "font-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  /* El navegador pide los marcadores en vivo y el índice del buscador directo al API. */
  `connect-src 'self' ${API_URL}`,
].join('; ');

const SEGURIDAD: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': POLITICA_DE_CONTENIDO,
};

function protegida(response: Response): Response {
  for (const [nombre, valor] of Object.entries(SEGURIDAD)) response.headers.set(nombre, valor);
  return response;
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  if (process.env.VERCEL) return protegida(await next());

  const response = protegida(await next());

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
