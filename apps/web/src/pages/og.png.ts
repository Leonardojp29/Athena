import type { APIRoute } from 'astro';
import { ANCHO, dibujarPortada } from '../tarjeta/marca';
import { comoPng } from '../tarjeta/resvg';

/*
 * La imagen que sale al compartir una página que no tiene una propia. Es la misma para todas, así
 * que se dibuja una vez y se guarda en el borde hasta que cambie el despliegue.
 */
export const GET: APIRoute = async () => {
  return new Response(await comoPng(dibujarPortada(), ANCHO), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=3600, s-maxage=31536000, immutable',
    },
  });
};
