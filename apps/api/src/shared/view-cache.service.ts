import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS } from './redis.provider.js';

/**
 * Caché de vistas compuestas en Redis.
 *
 * Medido: cada endpoint de vista tardaba entre dos y cuatro segundos, no por las consultas en sí
 * sino porque cada una viaja a Supabase desde fuera de su región —cerca de un segundo por ida y
 * vuelta— y una vista compone varias. Los controladores ya declaraban cuánto vale cada respuesta
 * en su `Cache-Control`; acá se cumple del lado del servidor, así que el trabajo se hace una vez
 * y no una vez por visitante.
 *
 * Si Redis no está, se ejecuta la consulta y listo: un caché caído tiene que degradar el
 * rendimiento, nunca la disponibilidad.
 */
@Injectable()
export class ViewCacheService {
  private readonly logger = new Logger(ViewCacheService.name);
  private avisado = false;

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /**
   * El TTL puede depender de lo calculado: un partido terminado ya no cambia y merece una hora,
   * mientras uno en juego no aguanta más de quince segundos.
   */
  async wrap<T>(
    clave: string,
    ttl: number | ((valor: T) => number),
    calcular: () => Promise<T>,
  ): Promise<T> {
    const full = `view:${clave}`;

    try {
      const guardado = await this.redis.get(full);
      if (guardado !== null) return JSON.parse(guardado) as T;
    } catch (error) {
      this.avisarUnaVez(error);
    }

    const valor = await calcular();

    try {
      /* Las fechas ya vienen serializadas por JSON.stringify; el cliente las recibe igual. */
      const segundos = typeof ttl === 'function' ? ttl(valor) : ttl;
      await this.redis.set(full, JSON.stringify(valor), 'EX', segundos);
    } catch (error) {
      this.avisarUnaVez(error);
    }

    return valor;
  }

  /** Un Redis caído no puede llenar el log con una línea por request. */
  private avisarUnaVez(error: unknown): void {
    if (this.avisado) return;
    this.avisado = true;
    this.logger.warn(`Caché de vistas no disponible: ${String(error).slice(0, 120)}`);
  }
}
