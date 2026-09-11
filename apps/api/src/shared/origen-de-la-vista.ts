import { AsyncLocalStorage } from 'node:async_hooks';

export type OrigenDeLaVista = 'hit' | 'stale' | 'miss';

const almacen = new AsyncLocalStorage<{ origen: OrigenDeLaVista }>();

/**
 * De dónde salió la respuesta de esta petición.
 *
 * Sin esto no había forma de distinguir una vista servida desde la caché de una recalculada, y "el
 * API va lento" era una impresión y no un número. Viaja por `AsyncLocalStorage` porque la caché está
 * tres capas debajo del controlador y pasarla a mano ensuciaría cada firma del camino.
 *
 * `enterWith` y no `run`: el interceptor devuelve un observable que se suscribe después de que su
 * función terminó, y `run` solo alcanza a lo que arranca dentro de ella.
 */
export function abrirOrigenDeLaVista(): void {
  almacen.enterWith({ origen: 'miss' });
}

export function marcarOrigen(origen: OrigenDeLaVista): void {
  const marca = almacen.getStore();
  if (marca) marca.origen = origen;
}

export function origenDeLaVista(): OrigenDeLaVista | null {
  return almacen.getStore()?.origen ?? null;
}
