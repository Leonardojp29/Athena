import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';

/**
 * El registro de los recurrentes: cuándo corrió cada uno por última vez.
 *
 * Ya no programa nada —el tic lo dispara pg_cron en producción y el bucle del worker en local—,
 * pero el sello de cada corrida sigue siendo el diagnóstico más barato del sistema: si
 * `daily-refresh` tiene más de un día, algo no está corriendo, y `atrasados()` lo dice para que
 * quien despierte lo recupere. Así fue como un cron de medianoche estuvo ocho días sin correr sin
 * que fallara nada: desde entonces, esto existe.
 */
export type JobRecurrente = 'live-tick' | 'process-outbox' | 'daily-refresh';

/* La primera corrida siembra la tabla: una tabla vacía que promete algo miente sobre el sistema. */
const SEMILLA: Array<{ jobKind: JobRecurrente; cron: string | null; metadata: object }> = [
  { jobKind: 'live-tick', cron: null, metadata: { everyMs: 60_000 } },
  { jobKind: 'process-outbox', cron: null, metadata: { everyMs: 30_000 } },
  { jobKind: 'daily-refresh', cron: '0 5 * * *', metadata: { tz: 'UTC' } },
];

const CONOCIDOS = new Set<string>(SEMILLA.map((s) => s.jobKind));
const UN_DIA_MS = 24 * 3600_000;

@Injectable()
export class SyncScheduleService {
  private readonly logger = new Logger(SyncScheduleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Siembra las cadencias si la tabla está vacía. Se llama al arrancar el worker; es idempotente. */
  async seed(): Promise<void> {
    try {
      const existentes = await this.prisma.syncSchedule.findMany({ select: { jobKind: true } });
      if (existentes.length > 0) return;
      await this.prisma.syncSchedule.createMany({
        data: SEMILLA.map((s) => ({ jobKind: s.jobKind, cron: s.cron ?? '', metadata: s.metadata })),
      });
      this.logger.log('Cadencia sembrada en sync_schedules');
    } catch (error) {
      this.logger.warn(`No se pudo sembrar sync_schedules: ${String(error).slice(0, 120)}`);
    }
  }

  /** Marca el último arranque. Sin esto la tabla no sirve para diagnosticar nada. */
  async markRun(jobKind: string): Promise<void> {
    if (!CONOCIDOS.has(jobKind)) return;
    await this.prisma.syncSchedule
      .update({ where: { jobKind }, data: { lastRunAt: new Date() } })
      .catch(() => undefined);
  }

  /**
   * Los de horario fijo que llevan más de un día sin correr.
   *
   * Un cron solo dispara si hay alguien despierto a esa hora: el refresco diario va a las 05:00 UTC
   * y en una máquina apagada a medianoche no corría nunca. Quien arranca —el worker local o el
   * primer tic del día en producción— pregunta esto y recupera lo perdido.
   */
  async atrasados(): Promise<JobRecurrente[]> {
    try {
      const filas = await this.prisma.syncSchedule.findMany({
        where: { enabled: true },
        select: { jobKind: true, cron: true, lastRunAt: true },
      });
      return filas
        .filter((f) => CONOCIDOS.has(f.jobKind))
        .filter((f) => f.cron !== null && f.cron.trim() !== '')
        .filter((f) => Date.now() - (f.lastRunAt?.getTime() ?? 0) > UN_DIA_MS)
        .map((f) => f.jobKind as JobRecurrente);
    } catch {
      /* Sin base no hay diagnóstico, pero tampoco puede ser lo que impida arrancar. */
      return [];
    }
  }
}
