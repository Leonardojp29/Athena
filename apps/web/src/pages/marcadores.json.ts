import type { APIRoute } from 'astro';
import { api, type Marcadores } from '../lib/api';

export const GET: APIRoute = async () => {
  try {
    const marcadores = await api<Marcadores>('/views/marcadores');
    return new Response(JSON.stringify(marcadores), {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, s-maxage=5',
      },
    });
  } catch {
    return new Response('null', {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }
};
