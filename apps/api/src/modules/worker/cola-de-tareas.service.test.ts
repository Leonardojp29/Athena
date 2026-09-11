import { describe, expect, it } from 'vitest';
import type { PrismaService } from '../../shared/prisma.service.js';
import { ColaDeTareas, ErrorNoReintentable, type Tarea } from './cola-de-tareas.service.js';

interface Sentencia {
  sql: string;
  valores: unknown[];
}

function colaEspia(): { cola: ColaDeTareas; sentencias: Sentencia[] } {
  const sentencias: Sentencia[] = [];
  const prisma = {
    $executeRaw: (plantilla: TemplateStringsArray, ...valores: unknown[]) => {
      sentencias.push({ sql: plantilla.join('?'), valores });
      return Promise.resolve(1);
    },
  } as unknown as PrismaService;
  return { cola: new ColaDeTareas(prisma), sentencias };
}

const tarea = (intentos: number): Tarea => ({ id: 1n, tipo: 'match-detail', datos: {}, intentos });

describe('ColaDeTareas', () => {
  it('reintenta con esperas cada vez más largas', async () => {
    const { cola, sentencias } = colaEspia();

    await cola.fallar(tarea(0), new Error('proveedor caído'));
    await cola.fallar(tarea(3), new Error('proveedor caído'));

    expect(sentencias).toHaveLength(2);
    expect(sentencias[0]?.sql).toContain('UPDATE tareas');
    expect(sentencias[0]?.valores).toContain(5);
    expect(sentencias[1]?.valores).toContain(300);
  });

  /* Antes eran tres intentos en veinte segundos: una caída de diez minutos borraba la tanda entera. */
  it('descarta recién cuando agotó la escalera', async () => {
    const { cola, sentencias } = colaEspia();

    await cola.fallar(tarea(6), new Error('sigue caído'));

    expect(sentencias[0]?.sql).toContain('DELETE FROM tareas');
  });

  it('lo que no se arregla esperando se descarta en el primer intento', async () => {
    const { cola, sentencias } = colaEspia();

    await cola.fallar(tarea(0), new ErrorNoReintentable('Tarea desconocida: fantasma'));

    expect(sentencias[0]?.sql).toContain('DELETE FROM tareas');
  });

  /* Con la cuota agotada la tarea no tiene nada malo: no puede gastar un intento por esperar. */
  it('posponer no incrementa los intentos', async () => {
    const { cola, sentencias } = colaEspia();

    await cola.posponer(tarea(1), 60_000, 'cuota agotada');

    expect(sentencias[0]?.sql).toContain('UPDATE tareas');
    expect(sentencias[0]?.sql).not.toContain('intentos = intentos + 1');
    expect(sentencias[0]?.valores).toContain(60);
  });
});
