import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';

/**
 * La cola de trabajos del sync, en Postgres.
 *
 * Reemplaza a BullMQ por una razón de despliegue: en serverless no hay un proceso escuchando una
 * cola, hay un tic por minuto que toma lo pendiente y lo ejecuta hasta agotar su presupuesto de
 * tiempo. Para el volumen de Athena —decenas de tareas por minuto en el peor sábado— una tabla con
 * `FOR UPDATE SKIP LOCKED` da exactamente las mismas garantías: prioridad, retraso, reintentos con
 * espera creciente, y que dos procesos no tomen la misma tarea.
 *
 * Lo que se gana de regalo: la cola sobrevive a cualquier reinicio, se consulta con SQL, y ya no
 * existe la categoría de accidente "borré la caché y me llevé los trabajos".
 */
export interface Tarea {
  id: bigint;
  tipo: string;
  datos: Record<string, unknown>;
  intentos: number;
}

/** Un fallo que no se arregla esperando: la tarea se descarta en el primer intento. */
export class ErrorNoReintentable extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorNoReintentable';
  }
}

/*
 * Tres intentos en veinte segundos era una condena para cualquier fallo que dure minutos: la caída
 * de un proveedor se llevaba por delante toda la tanda. La escalera llega ahora hasta las dos horas.
 */
const ESPERAS_MS = [5_000, 10_000, 20_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000];
/* Si el proceso muere con la tarea tomada, a los dos minutos la retoma cualquier otro. */
const CANDADO_MS = 2 * 60_000;

@Injectable()
export class ColaDeTareas {
  private readonly logger = new Logger(ColaDeTareas.name);

  constructor(private readonly prisma: PrismaService) {}

  async encolar(
    tipo: string,
    datos: Record<string, unknown>,
    opts?: { delayMs?: number; prioridad?: number },
  ): Promise<void> {
    /*
     * Si ya hay una pendiente igual, esta sobra: la que está gana y conserva su turno. Sin esto la
     * cola creció a setenta mil filas con solo dos mil seiscientas tareas distintas adentro.
     */
    await this.prisma.$executeRaw`
      INSERT INTO tareas (tipo, datos, prioridad, corre_despues)
      VALUES (${tipo}, ${JSON.stringify(datos)}::jsonb, ${opts?.prioridad ?? 5},
              now() + make_interval(secs => ${(opts?.delayMs ?? 0) / 1000}))
      ON CONFLICT (tipo, datos) DO NOTHING`;
  }

  /** Toma hasta `limite` tareas listas, candadeadas para este proceso. */
  async tomar(limite: number): Promise<Tarea[]> {
    return this.prisma.$queryRaw<Tarea[]>`
      UPDATE tareas SET tomada_hasta = now() + make_interval(secs => ${CANDADO_MS / 1000})
      WHERE id IN (
        SELECT id FROM tareas
        WHERE corre_despues <= now() AND (tomada_hasta IS NULL OR tomada_hasta <= now())
        ORDER BY prioridad, id
        LIMIT ${limite}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, tipo, datos, intentos`;
  }

  async completar(id: bigint): Promise<void> {
    await this.prisma.$executeRaw`DELETE FROM tareas WHERE id = ${id}`;
  }

  /** Reintento con espera creciente; al agotar los intentos, la tarea se descarta y se reporta. */
  async fallar(tarea: Tarea, error: unknown): Promise<void> {
    const motivo = String(error).slice(0, 200);
    const espera = ESPERAS_MS[tarea.intentos];

    if (espera === undefined || error instanceof ErrorNoReintentable) {
      await this.completar(tarea.id);
      this.logger.error(`Tarea ${tarea.tipo}#${tarea.id} descartada: ${motivo}`);
      return;
    }

    await this.prisma.$executeRaw`
      UPDATE tareas SET intentos = intentos + 1, tomada_hasta = NULL, ultimo_error = ${motivo},
        corre_despues = now() + make_interval(secs => ${espera / 1000})
      WHERE id = ${tarea.id}`;
  }

  /**
   * La tarea vuelve a la cola sin gastar un intento.
   *
   * Es lo que separa "el trabajo falló" de "ahora no se puede trabajar": con la cuota agotada, tres
   * reintentos en veinte segundos borraban tareas que no tenían nada malo.
   */
  async posponer(tarea: Tarea, esperaMs: number, motivo: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE tareas SET tomada_hasta = NULL, ultimo_error = ${motivo},
        corre_despues = now() + make_interval(secs => ${esperaMs / 1000})
      WHERE id = ${tarea.id}`;
  }

  async pendientes(): Promise<number> {
    const [fila] = await this.prisma.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n FROM tareas`;
    return Number(fila?.n ?? 0);
  }

  async resumen(): Promise<{ total: number; atrasadas: number; conFallos: number }> {
    const [fila] = await this.prisma.$queryRaw<
      Array<{ total: bigint; atrasadas: bigint; con_fallos: bigint }>
    >`
      SELECT COUNT(*) AS total,
             COUNT(*) FILTER (WHERE corre_despues < now() - interval '10 minutes') AS atrasadas,
             COUNT(*) FILTER (WHERE intentos > 0) AS con_fallos
      FROM tareas`;
    return {
      total: Number(fila?.total ?? 0),
      atrasadas: Number(fila?.atrasadas ?? 0),
      conFallos: Number(fila?.con_fallos ?? 0),
    };
  }
}
