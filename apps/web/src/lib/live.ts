import { api, type HomeView } from './api';

/*
 * El TTL lo decide el propio API con su `Cache-Control` y lo honra `api()`. Acá queda solo lo
 * que esa capa no puede dar: si el API se cae, seguir sirviendo lo último bueno en lugar de
 * dejar la home vacía.
 */
let ultimoBueno: HomeView | null = null;

export async function getHomeView(): Promise<HomeView | null> {
  try {
    const value = await api<HomeView>('/views/home');
    ultimoBueno = value;
    return value;
  } catch {
    return ultimoBueno;
  }
}
