import { Injectable, Logger } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../shared/prisma.service.js';

/**
 * La cadencia de los jobs recurrentes vive en `sync_schedules`, no en el código.
 *
 * La tabla existía desde la Fase 0 con ese comentario y nadie la leía: los tres schedulers
 * estaban cableados. Una tabla vacía que promete algo es peor que no tenerla, porque miente
 * sobre la forma del sistema.
 *
 * `cron` lleva un patrón de cinco campos; para intervalos que no se pueden expresar en cron
 * —30 segundos, por ejemplo— va `metadata.everyMs`. Exactamente uno de los dos.
 */
export type JobRecurrente = 'live-tick' | 'process-outbox' | 'daily-refresh';

interface Cadencia {
  jobKind: JobRecurrente;
  cron: string | null;
  everyMs: number | null;
  tz?: string;
}

/* Lo que estaba cableado, ahora como semilla: la primera corrida se comporta igual que antes. */
const SEMILLA: Cadencia[] = [
  { jobKind: 'live-tick', cron: null, everyMs: 60_000 },
  { jobKind: 'process-outbox', cron: null, everyMs: 30_000 },
  { jobKind: 'daily-refresh', cron: '0 5 * * *', everyMs: null, tz: 'UTC' },
];

const CONOCIDOS = new Set<string>(SEMILLA.map((s) => s.jobKind));

@Injectable()
export class SyncScheduleService {
  private readonly logger = new Logger(SyncScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra en BullMQ lo que dice la tabla y quita lo que quedó apagado. Si la base no
   * responde, cae a la semilla: un worker que no arranca porque no pudo leer una cadencia es
   * peor que un worker con la cadencia por defecto.
   */
  async apply(queue: Queue): Promise<void> {
    let filas: Cadencia[];
    try {
      filas = await this.load();
    } catch (error) {
      this.logger.warn(
        `No se pudo leer sync_schedules (${String(error).slice(0, 120)}): se usa la cadencia por defecto`,
      );
      filas = SEMILLA;
    }

    const activos = new Map(filas.map((f) => [f.jobKind, f]));

    for (const jobKind of CONOCIDOS as Set<JobRecurrente>) {
      const cadencia = activos.get(jobKind);
      if (!cadencia) {
        await queue.removeJobScheduler(jobKind).catch(() => undefined);
        continue;
      }
      await queue.upsertJobScheduler(
        jobKind,
        cadencia.everyMs !== null
          ? { every: cadencia.everyMs }
          : { pattern: cadencia.cron as string, tz: cadencia.tz },
        { name: jobKind },
      );
    }

    this.logger.log(
      `Cadencia desde la base: ${[...activos.values()].map(describir).join(' · ') || 'ninguna'}`,
    );
  }

  /** Marca el último arranque. Sin esto la tabla no sirve para diagnosticar nada. */
  async markRun(jobKind: string): Promise<void> {
    if (!CONOCIDOS.has(jobKind)) return;
    await this.prisma.syncSchedule
      .update({ where: { jobKind }, data: { lastRunAt: new Date() } })
      .catch(() => undefined);
  }

  private async load(): Promise<Cadencia[]> {
    const filas = await this.prisma.syncSchedule.findMany({
      select: { jobKind: true, cron: true, enabled: true, metadata: true },
    });

    if (filas.length === 0) {
      await this.seed();
      return SEMILLA;
    }

    const salida: Cadencia[] = [];
    for (const fila of filas) {
      if (!fila.enabled) continue;
      if (!CONOCIDOS.has(fila.jobKind)) {
        this.logger.warn(`sync_schedules tiene un job que este worker no conoce: ${fila.jobKind}`);
        continue;
      }
      const meta = (fila.metadata ?? {}) as { everyMs?: number; tz?: string };
      const everyMs = typeof meta.everyMs === 'number' && meta.everyMs > 0 ? meta.everyMs : null;
      const cron = fila.cron.trim() === '' ? null : fila.cron;

      /* Una fila sin ninguno de los dos no se puede programar y no vale apagar el worker. */
      if (everyMs === null && cron === null) {
        this.logger.warn(`sync_schedules ${fila.jobKind}: sin cron ni metadata.everyMs, se omite`);
        continue;
      }
      salida.push({
        jobKind: fila.jobKind as JobRecurrente,
        cron,
        everyMs,
        ...(meta.tz ? { tz: meta.tz } : {}),
      });
    }
    return salida;
  }

  private async seed(): Promise<void> {
    await this.prisma.syncSchedule.createMany({
      data: SEMILLA.map((s) => ({
        jobKind: s.jobKind,
        cron: s.cron ?? '',
        enabled: true,
        metadata: {
          ...(s.everyMs !== null ? { everyMs: s.everyMs } : {}),
          ...(s.tz ? { tz: s.tz } : {}),
        },
      })),
      skipDuplicates: true,
    });
    this.logger.log('sync_schedules estaba vacía: sembrada con la cadencia por defecto');
  }
}

function describir(c: Cadencia): string {
  return `${c.jobKind} ${c.everyMs !== null ? `cada ${c.everyMs / 1000}s` : `${c.cron} ${c.tz ?? ''}`.trim()}`;
}
