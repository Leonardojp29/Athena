import type { APIRoute } from 'astro';

/*
 * La tarjeta se mudó con su página a `/calculadora-liga-1/`.
 *
 * Esta queda porque la imagen vieja está incrustada en cada vista previa que ya circula por los
 * chats: ahí la URL quedó escrita y no se puede reescribir.
 */
export const GET: APIRoute = ({ url }) =>
  new Response(null, {
    status: 301,
    headers: { location: `/calculadora-liga-1/tarjeta.png${url.search}` },
  });
