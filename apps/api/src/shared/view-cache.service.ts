import { Injectable } from '@nestjs/common';
import { Memoria } from './memoria.js';
import { logJson, reportError } from './observability.js';
import { marcarOrigen } from './origen-de-la-vista.js';
import { PrismaService } from './prisma.service.js';

/**
 * Cuánto tiempo se sigue sirviendo una vista después de vencer su frescura.
 *
 * Es lo que evita que una instancia fría calcule: aunque el dato tenga horas, se responde al
 * instante y la renovación ocurre por detrás. Un día es el techo; más viejo que eso, mejor esperar.
 */
const VENTANA_DE_GRACIA_S = 24 * 3600;

interface FilaDeVista {
  cuerpo: unknown;
  fresca_hasta: Date;
}

/**
 * Caché de vistas compuestas, en dos niveles.
 *
 * Medido: cada endpoint de vista tardaba entre dos y cuatro segundos, no por las consultas en sí
 * sino porque cada una viaja a Supabase desde fuera de su región —cerca de un segundo por ida y
 * vuelta— y una vista compone varias.
 *
 * El primer nivel es la memoria del proceso, que solo cubre a la instancia que la calentó. El
 * segundo vive en Postgres y lo comparten todas: en serverless cada arranque en frío recalculaba
 * las once consultas de una competencia, y ahora le basta una lectura por clave primaria.
 */
@Injectable()
export class ViewCacheService {
  private readonly memoria = new Memoria(500);
  private readonly enVuelo = new Map<string, Promise<unknown>>();
  private readonly renovando = new Set<string>();

  constructor(private readonly prisma: PrismaService) {}

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
    if (guardado !== undefined) {
      marcarOrigen('hit');
      return guardado as T;
    }

    /* Diez visitantes al mismo tiempo sobre una vista fría la leían y la calculaban diez veces. */
    const pendiente = this.enVuelo.get(clave);
    if (pendiente) return pendiente as Promise<T>;

    const resolucion = this.resolver(clave, ttl, calcular).finally(() => this.enVuelo.delete(clave));
    this.enVuelo.set(clave, resolucion);
    return resolucion;
  }

  private async resolver<T>(
    clave: string,
    ttl: number | ((valor: T) => number),
    calcular: () => Promise<T>,
  ): Promise<T> {
    const compartida = await this.leerDeLaBase(clave);
    if (compartida) {
      const valor = compartida.valor as T;
      this.memoria.set(`view:${clave}`, valor, this.segundos(ttl, valor));
      marcarOrigen(compartida.fresca ? 'hit' : 'stale');
      if (!compartida.fresca) this.renovarPorDetras(clave, ttl, calcular);
      return valor;
    }

    const valor = await calcular();
    const segundos = this.segundos(ttl, valor);
    this.memoria.set(`view:${clave}`, valor, segundos);
    await this.guardarEnLaBase(clave, valor, segundos);
    return valor;
  }

  borrar(clave: string): void {
    this.memoria.delete(`view:${clave}`);
    void this.prisma
      .$executeRaw`DELETE FROM vistas_cache WHERE clave = ${clave}`.catch(() => undefined);
  }

  /** Las vistas que ya nadie va a servir. Corre con el refresco diario. */
  async podar(): Promise<number> {
    return this.prisma.$executeRaw`DELETE FROM vistas_cache WHERE vence_en < now()`;
  }

  /**
   * Renueva una vista vencida sin hacer esperar a quien la pidió.
   *
   * `renovando` es aparte de `enVuelo` a propósito: la petición que recibió lo viejo ya ocupa su
   * entrada, y mirar ahí haría que la renovación se saltara siempre a sí misma.
   */
  private renovarPorDetras<T>(
    clave: string,
    ttl: number | ((valor: T) => number),
    calcular: () => Promise<T>,
  ): void {
    if (this.renovando.has(clave)) return;
    this.renovando.add(clave);

    void calcular()
      .then(async (valor) => {
        const segundos = this.segundos(ttl, valor);
        this.memoria.set(`view:${clave}`, valor, segundos);
        await this.guardarEnLaBase(clave, valor, segundos);
      })
      .catch((error: unknown) => {
        logJson('warn', 'renovacion_de_vista_fallida', { clave, error: String(error).slice(0, 160) });
      })
      .finally(() => this.renovando.delete(clave));
  }

  private async leerDeLaBase(
    clave: string,
  ): Promise<{ valor: unknown; fresca: boolean } | undefined> {
    try {
      const [fila] = await this.prisma.$queryRaw<FilaDeVista[]>`
        SELECT cuerpo, fresca_hasta FROM vistas_cache
        WHERE clave = ${clave} AND vence_en > now()`;
      if (!fila) return undefined;
      return { valor: fila.cuerpo, fresca: fila.fresca_hasta.getTime() > Date.now() };
    } catch (error) {
      /* La caché no puede tumbar una vista: si la base no responde, se calcula igual. */
      reportError(error, { clave });
      return undefined;
    }
  }

  private async guardarEnLaBase(clave: string, valor: unknown, segundos: number): Promise<void> {
    try {
      await this.prisma.$executeRaw`
        INSERT INTO vistas_cache (clave, cuerpo, fresca_hasta, vence_en, calculada_en)
        VALUES (${clave}, ${JSON.stringify(valor)}::jsonb,
                now() + make_interval(secs => ${segundos}),
                now() + make_interval(secs => ${VENTANA_DE_GRACIA_S}), now())
        ON CONFLICT (clave) DO UPDATE
          SET cuerpo = EXCLUDED.cuerpo,
              fresca_hasta = EXCLUDED.fresca_hasta,
              vence_en = EXCLUDED.vence_en,
              calculada_en = EXCLUDED.calculada_en`;
    } catch (error) {
      reportError(error, { clave });
    }
  }

  private segundos<T>(ttl: number | ((valor: T) => number), valor: T): number {
    return typeof ttl === 'function' ? ttl(valor) : ttl;
  }
}
