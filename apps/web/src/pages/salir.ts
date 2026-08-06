import type { APIRoute } from 'astro';
import { createSupabaseServerClient, isAuthConfigured } from '../lib/supabase';

export const POST: APIRoute = async ({ cookies, request, redirect }) => {
  if (isAuthConfigured) {
    await createSupabaseServerClient({ cookies, request }).auth.signOut();
  }
  return redirect('/');
};
