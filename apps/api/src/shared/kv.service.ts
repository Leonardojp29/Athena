import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * El estado compartido chico, en Postgres: lo que antes vivía en Redis.
 *
 * Acá va lo que varios procesos tienen que ver a la vez —la cuota real de API-Football, el gasto
 * diario de OpenAI, las marcas de espera de los reintentos— y nada más. Lo que es caché puro vive
 * en la memoria de cada proceso: un caché no necesita ser compartido, necesita ser barato.
 */
@Injectable()
export class KvService {
  constructor(private readonly prisma: PrismaService) {}

  async fijar(clave: string, numero: number, ttlSegundos: number): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO kv (clave, numero, vence_en)
      VALUES (${clave}, ${numero}, now() + make_interval(secs => ${ttlSegundos}))
      ON CONFLICT (clave) DO UPDATE SET numero = EXCLUDED.numero, vence_en = EXCLUDED.vence_en`;
  }

  /** null si no existe o venció: una cuota vieja es peor que ninguna. */
  async leer(claves: string[]): Promise<Map<string, number>> {
    if (claves.length === 0) return new Map();
    const filas = await this.prisma.$queryRaw<Array<{ clave: string; numero: bigint | null }>>`
      SELECT clave, numero FROM kv
      WHERE clave = ANY(${claves}) AND (vence_en IS NULL OR vence_en > now())`;
    return new Map(
      filas.filter((f) => f.numero !== null).map((f) => [f.clave, Number(f.numero)]),
    );
  }

  /** Suma atómica entre procesos: el tope de tokens no puede depender de quién sumó último. */
  async incrementar(clave: string, delta: number, ttlSegundos: number): Promise<number> {
    const filas = await this.prisma.$queryRaw<Array<{ numero: bigint }>>`
      INSERT INTO kv (clave, numero, vence_en)
      VALUES (${clave}, ${delta}, now() + make_interval(secs => ${ttlSegundos}))
      ON CONFLICT (clave) DO UPDATE SET
        numero = CASE WHEN kv.vence_en IS NOT NULL AND kv.vence_en <= now()
                      THEN EXCLUDED.numero ELSE kv.numero + EXCLUDED.numero END,
        vence_en = CASE WHEN kv.vence_en IS NOT NULL AND kv.vence_en <= now()
                        THEN EXCLUDED.vence_en ELSE kv.vence_en END
      RETURNING numero`;
    return Number(filas[0]?.numero ?? delta);
  }

  /**
   * La marca "ya lo intenté hace poco": pone la clave solo si no existe o ya venció, y dice si la
   * puso. Es el SET NX EX de Redis, que es lo que evita repreguntar cada minuto por un partido
   * cuyo dato llega horas tarde.
   */
  async marcar(clave: string, ttlSegundos: number): Promise<boolean> {
    const filas = await this.prisma.$queryRaw<Array<{ clave: string }>>`
      INSERT INTO kv (clave, numero, vence_en)
      VALUES (${clave}, 1, now() + make_interval(secs => ${ttlSegundos}))
      ON CONFLICT (clave) DO UPDATE SET vence_en = EXCLUDED.vence_en
      WHERE kv.vence_en IS NULL OR kv.vence_en <= now()
      RETURNING clave`;
    return filas.length > 0;
  }
}
