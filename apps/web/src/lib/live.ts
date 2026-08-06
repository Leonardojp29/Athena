import { api, type HomeView } from './api';

/*
 * El chrome necesita los partidos del día dos veces por render (la tira y la píldora del
 * header) y la home los pide una tercera. Un memo corto sirve las tres con una sola llamada
 * y, si el API cae, devuelve lo último bueno antes de rendirse.
 */
const TTL_MS = 15_000;
let cache: { at: number; value: HomeView } | null = null;

export async function getHomeView(): Promise<HomeView | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const value = await api<HomeView>('/views/home');
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return cache?.value ?? null;
  }
}
