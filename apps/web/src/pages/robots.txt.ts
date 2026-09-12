import type { APIRoute } from 'astro';

/*
 * Lo que se le pide a un rastreador: que pase por todo.
 *
 * Sin `Disallow`, y es a propósito. Lo que no queremos indexado ya lo dice cada página por su
 * cuenta: `/buscar` y `/comparar` con `noindex`, y las vistas que la home abre adentro
 * —`?equipo=`, `?liga=`, `?jugador=`— con el canónico apuntando a la ficha de verdad. Bloquear
 * esas direcciones acá sería contraproducente: un rastreador que no puede entrar tampoco lee el
 * `noindex` ni el canónico, y termina indexando la URL a ciegas, que es justo lo contrario.
 */
const CUERPO = `User-agent: *
Allow: /

Sitemap: {SITEMAP}
`;

export const GET: APIRoute = ({ site }) =>
  new Response(CUERPO.replace('{SITEMAP}', new URL('/sitemap.xml', site).toString()), {
    headers: {
      'Content-Type': 'text/plain',
      /* Sin esto, cada visita de un rastreador levantaba una función desde frío por cuatro líneas. */
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
