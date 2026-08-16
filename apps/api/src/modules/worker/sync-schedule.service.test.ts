import { describe, expect, it, vi } from 'vitest';
import { SyncScheduleService } from './sync-schedule.service.js';
import type { PrismaService } from '../../shared/prisma.service.js';

/*
 * Lo que hay que verificar es el diagnóstico: que la siembra no pise una tabla con datos, que el
 * sello de corrida solo acepte jobs conocidos, y sobre todo que `atrasados()` detecte al diario
 * perdido —un cron de medianoche en una máquina apagada no corre nunca, y esto es lo único que lo
 * delata—. Y que nada de esto pueda impedir un arranque si la base no responde.
 */
function fakePrisma(filas: unknown[] | Error) {
  const creados: unknown[] = [];
  const actualizados: unknown[] = [];
  const prisma = {
    syncSchedule: {
      findMany: vi.fn(async () => {
        if (filas instanceof Error) throw filas;
        return filas;
      }),
      createMany: vi.fn(async (args: { data: unknown[] }) => {
        creados.push(...args.data);
        return { count: args.data.length };
      }),
      update: vi.fn(async (args: unknown) => {
        actualizados.push(args);
        return {};
      }),
    },
  } as unknown as PrismaService;
  return { prisma, creados, actualizados };
}

const fila = (over: Record<string, unknown> = {}) => ({
  jobKind: 'daily-refresh',
  cron: '0 5 * * *',
  enabled: true,
  lastRunAt: null,
  ...over,
});

describe('SyncScheduleService', () => {
  it('siembra la cadencia solo cuando la tabla está vacía', async () => {
    const vacia = fakePrisma([]);
    await new SyncScheduleService(vacia.prisma).seed();
    expect(vacia.creados).toHaveLength(3);

    const conDatos = fakePrisma([fila()]);
    await new SyncScheduleService(conDatos.prisma).seed();
    expect(conDatos.creados).toHaveLength(0);
  });

  it('sella la última corrida solo de los jobs que conoce', async () => {
    const { prisma, actualizados } = fakePrisma([]);
    const servicio = new SyncScheduleService(prisma);
    await servicio.markRun('live-tick');
    await servicio.markRun('sync:inventado');
    expect(actualizados).toHaveLength(1);
  });

  it('detecta al diario que lleva más de un día sin correr', async () => {
    const { prisma } = fakePrisma([
      fila({ lastRunAt: new Date(Date.now() - 30 * 3600_000) }),
      fila({ jobKind: 'live-tick', cron: '', lastRunAt: new Date() }),
    ]);
    expect(await new SyncScheduleService(prisma).atrasados()).toEqual(['daily-refresh']);
  });

  it('no acusa al que corrió hace un rato ni a los de intervalo', async () => {
    const { prisma } = fakePrisma([
      fila({ lastRunAt: new Date(Date.now() - 3600_000) }),
      /* live-tick no lleva cron: si el worker está caído, lo delata otra cosa, no esto. */
      fila({ jobKind: 'live-tick', cron: '', lastRunAt: new Date(Date.now() - 3 * 86_400_000) }),
    ]);
    expect(await new SyncScheduleService(prisma).atrasados()).toEqual([]);
  });

  it('el diagnóstico jamás impide arrancar: sin base, lista vacía', async () => {
    const { prisma } = fakePrisma(new Error('connection refused'));
    expect(await new SyncScheduleService(prisma).atrasados()).toEqual([]);
  });
});
