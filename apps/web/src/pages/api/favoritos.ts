import type { APIRoute } from 'astro';
import { getSession, type AstroContextLike } from '../../lib/supabase';

const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * El access token vive en cookies httpOnly: el navegador nunca lo ve, así que
 * el toggle de favoritos pasa por acá y el servidor lo reenvía al API.
 */
async function forward(method: 'POST' | 'DELETE', context: AstroContextLike): Promise<Response> {
  const session = await getSession(context);
  if (!session?.accessToken) {
    return new Response(JSON.stringify({ error: 'Necesitas iniciar sesión' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch(`${API_URL}/v1/me/favorites`, {
    method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: await context.request.text(),
  });

  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = ({ request, cookies }) => forward('POST', { request, cookies });
export const DELETE: APIRoute = ({ request, cookies }) => forward('DELETE', { request, cookies });
