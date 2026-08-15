import { describe, expect, it, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { SyncScheduleService } from './sync-schedule.service.js';
import type { PrismaService } from '../../shared/prisma.service.js';

/*
 * Lo que hay que verificar es la traducción de una fila a un scheduler de BullMQ y, sobre todo,
 * que ninguna fila mal escrita apague el worker: una cadencia inválida se omite, no explota.
 */
function fakeQueue() {
  const upserts: Array<{ key: string; repeat: unknown }> = [];
  const removidos: string[] = [];
  const encolados: string[] = [];
  const queue = {
    add: vi.fn(async (nombre: string) => {
      encolados.push(nombre);
      return {};
    }),
    upsertJobScheduler: vi.fn(async (key: string, repeat: unknown) => {
      upserts.push({ key, repeat });
    }),
    removeJobScheduler: vi.fn(async (key: string) => {
      removidos.push(key);
      return true;
    }),
  } as unknown as Queue;
  return { queue, upserts, removidos, encolados };
}

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
  jobKind: 'live-tick',
  cron: '',
  enabled: true,
  metadata: { everyMs: 60_000 },
  ...over,
});

describe('SyncScheduleService', () => {
  it('siembra la cadencia por defecto cuando la tabla está vacía', async () => {
    const { prisma, creados } = fakePrisma([]);
    const { queue, upserts } = fakeQueue();
    await new SyncScheduleService(prisma).apply(queue);

    expect(creados).toHaveLength(3);
    expect(upserts.map((u) => u.key).sort()).toEqual([
      'daily-refresh',
      'live-tick',
      'process-outbox',
    ]);
    // el comportamiento de la primera corrida es idéntico al que estaba cableado
    expect(upserts.find((u) => u.key === 'live-tick')?.repeat).toEqual({ every: 60_000 });
    expect(upserts.find((u) => u.key === 'daily-refresh')?.repeat).toEqual({
      pattern: '0 5 * * *',
      tz: 'UTC',
    });
  });

  it('traduce everyMs a un intervalo y cron a un patrón', async () => {
    const { prisma } = fakePrisma([
      fila({ jobKind: 'process-outbox', metadata: { everyMs: 15_000 } }),
      fila({ jobKind: 'daily-refresh', cron: '30 6 * * *', metadata: { tz: 'America/Lima' } }),
    ]);
    const { queue, upserts } = fakeQueue();
    await new SyncScheduleService(prisma).apply(queue);

    expect(upserts.find((u) => u.key === 'process-outbox')?.repeat).toEqual({ every: 15_000 });
    expect(upserts.find((u) => u.key === 'daily-refresh')?.repeat).toEqual({
      pattern: '30 6 * * *',
      tz: 'America/Lima',
    });
  });

  it('quita de BullMQ lo que quedó apagado en la tabla', async () => {
    const { prisma } = fakePrisma([fila({ jobKind: 'live-tick', enabled: false })]);
    const { queue, upserts, removidos } = fakeQueue();
    await new SyncScheduleService(prisma).apply(queue);

    expect(upserts).toHaveLength(0);
    expect(removidos.sort()).toEqual(['daily-refresh', 'live-tick', 'process-outbox']);
  });

  it('omite una fila sin cron ni everyMs en lugar de programar algo inválido', async () => {
    const { prisma } = fakePrisma([fila({ cron: '', metadata: {} })]);
    const { queue, upserts } = fakeQueue();
    await new SyncScheduleService(prisma).apply(queue);
    expect(upserts.map((u) => u.key)).not.toContain('live-tick');
  });

  it('ignora un job que este worker no sabe ejecutar', async () => {
    const { prisma } = fakePrisma([fila({ jobKind: 'sync:inventado' })]);
    const { queue, upserts } = fakeQueue();
    await new SyncScheduleService(prisma).apply(queue);
    expect(upserts).toHaveLength(0);
  });

  /*
   * Un cron solo dispara si hay alguien escuchando a esa hora: el refresco diario va a las 05:00
   * UTC y en una máquina apagada a esa hora no corre nunca. Las tablas de posiciones se quedaron
   * ocho días viejas sin que nada fallara, así que al arrancar se recupera lo atrasado.
   */
  it('encola al arrancar lo que hace más de un día que no corre', async () => {
    const ayer = new Date(Date.now() - 30 * 3600_000);
    const { prisma } = fakePrisma([
      fila({ jobKind: 'daily-refresh', cron: '0 5 * * *', lastRunAt: ayer }),
      fila({ jobKind: 'live-tick', lastRunAt: new Date() }),
    ]);
    const { queue, encolados } = fakeQueue();
    await new SyncScheduleService(prisma).apply(queue);

    expect(encolados).toEqual(['daily-refresh']);
  });

  it('no encola de más lo que corrió hace un rato', async () => {
    const { prisma } = fakePrisma([
      fila({ jobKind: 'daily-refresh', cron: '0 5 * * *', lastRunAt: new Date(Date.now() - 3600_000) }),
    ]);
    const { queue, encolados } = fakeQueue();
    await new SyncScheduleService(prisma).apply(queue);

    expect(encolados).toEqual([]);
  });

  it('cae a la cadencia por defecto si la base no responde', async () => {
    const { prisma } = fakePrisma(new Error('connection refused'));
    const { queue, upserts } = fakeQueue();
    await new SyncScheduleService(prisma).apply(queue);
    // un worker que no arranca por no leer una cadencia es peor que uno con la de por defecto
    expect(upserts).toHaveLength(3);
  });

  it('sella la última corrida solo de los jobs que conoce', async () => {
    const { prisma, actualizados } = fakePrisma([]);
    const service = new SyncScheduleService(prisma);
    await service.markRun('live-tick');
    await service.markRun('sync:inventado');
    expect(actualizados).toHaveLength(1);
    expect(actualizados[0]).toMatchObject({ where: { jobKind: 'live-tick' } });
  });
});
