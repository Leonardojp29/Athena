import { Injectable } from '@nestjs/common';
import { Memoria } from './memoria.js';

/**
 * Caché de vistas compuestas, en la memoria del proceso.
 *
 * Medido: cada endpoint de vista tardaba entre dos y cuatro segundos, no por las consultas en sí
 * sino porque cada una viaja a Supabase desde fuera de su región —cerca de un segundo por ida y
 * vuelta— y una vista compone varias. Los controladores ya declaran cuánto vale cada respuesta en
 * su `Cache-Control`; acá se cumple del lado del servidor, así que el trabajo se hace una vez y no
 * una vez por visitante.
 *
 * Vivió en Redis hasta que el despliegue pasó a serverless: en Vercel no hay Redis, pero sí hay
 * caché de borde que honra los mismos `s-maxage`, así que la memoria del proceso solo cubre las
 * invocaciones calientes y el borde cubre el resto. En local hay un solo proceso y es equivalente.
 */
@Injectable()
export class ViewCacheService {
  private readonly memoria = new Memoria(500);
  private readonly enVuelo = new Map<string, Promise<unknown>>();

  /**
   * El TTL puede depender de lo calculado: un partido terminado ya no cambia y merece una hora,
   * mientras uno en juego no aguanta más de quince segundos.
   */
  async wrap<T>(
    clave: string,
    ttl: number | ((valor: T) => number),
    calcular: () => Promise<T>,
  ): Promise<T> {
    const guardado = this.memoria.get(`view:${clave}`);
    if (guardado !== undefined) return guardado as T;

    /* Diez visitantes al mismo tiempo sobre una vista fría la calculaban diez veces. */
    const pendiente = this.enVuelo.get(clave);
    if (pendiente) return pendiente as Promise<T>;

    const calculo = calcular()
      .then((valor) => {
        this.memoria.set(`view:${clave}`, valor, typeof ttl === 'function' ? ttl(valor) : ttl);
        return valor;
      })
      .finally(() => this.enVuelo.delete(clave));

    this.enVuelo.set(clave, calculo);
    return calculo;
  }

  borrar(clave: string): void {
    this.memoria.delete(`view:${clave}`);
  }
}
