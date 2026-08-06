import { createServerClient, parseCookieHeader, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

const url = import.meta.env.PUBLIC_SUPABASE_URL ?? '';
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isAuthConfigured = Boolean(url && anonKey);

/** Lo que necesitamos del contexto de Astro; se puede pasar `Astro` directo. */
export interface AstroContextLike {
  cookies: AstroCookies;
  request: Request;
}

/**
 * Cliente de Supabase para SSR: la sesión vive en cookies httpOnly, no en localStorage,
 * así el servidor puede renderizar contenido personalizado en la primera respuesta.
 * AstroCookies no expone getAll(), por eso las de entrada se leen del header.
 */
export function createSupabaseServerClient({ cookies, request }: AstroContextLike) {
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () =>
        parseCookieHeader(request.headers.get('cookie') ?? '').map(({ name, value }) => ({
          name,
          value: value ?? '',
        })),
      setAll: (toSet: Array<{ name: string; value: string; options: CookieOptions }>) => {
        for (const { name, value, options } of toSet) {
          cookies.set(name, value, { ...options, path: options.path ?? '/' });
        }
      },
    },
  });
}

export async function getSession(context: AstroContextLike) {
  if (!isAuthConfigured) return null;
  const supabase = createSupabaseServerClient(context);
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: sessionData } = await supabase.auth.getSession();
  return {
    user: { id: data.user.id, email: data.user.email ?? null },
    accessToken: sessionData.session?.access_token ?? null,
  };
}
