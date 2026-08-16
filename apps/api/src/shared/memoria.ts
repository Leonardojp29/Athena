/**
 * Un caché en la memoria del proceso, con vencimiento y tope de tamaño.
 *
 * Reemplaza a Redis en todo lo que era caché puro: las vistas compuestas, los feature flags, los
 * embeddings de búsqueda. En local hay un solo proceso y rinde igual que Redis; en Vercel cada
 * instancia calienta la suya y la caché de borde —los `s-maxage` que el API ya declara— hace el
 * trabajo grueso entre instancias. Un caché no necesita ser compartido: necesita ser barato.
 *
 * El tope de entradas es un cinturón, no una política: con vistas que pesan decenas de KB, mil
 * entradas son unos MB y una función serverless no debe crecer sin techo.
 */
export class Memoria<T = unknown> {
  private readonly mapa = new Map<string, { valor: T; vence: number }>();

  constructor(private readonly tope = 1000) {}

  get(clave: string): T | undefined {
    const entrada = this.mapa.get(clave);
    if (!entrada) return undefined;
    if (entrada.vence <= Date.now()) {
      this.mapa.delete(clave);
      return undefined;
    }
    return entrada.valor;
  }

  set(clave: string, valor: T, ttlSegundos: number): void {
    /* El Map recuerda el orden de inserción: borrar el primero es echar al más viejo. */
    if (this.mapa.size >= this.tope && !this.mapa.has(clave)) {
      const primero = this.mapa.keys().next().value;
      if (primero !== undefined) this.mapa.delete(primero);
    }
    this.mapa.delete(clave);
    this.mapa.set(clave, { valor, vence: Date.now() + ttlSegundos * 1000 });
  }

  delete(clave: string): void {
    this.mapa.delete(clave);
  }
}
