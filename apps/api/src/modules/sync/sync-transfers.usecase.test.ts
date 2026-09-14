import { describe, expect, it } from 'vitest';
import type { ProviderTransfer } from '@athena/domain';
import type { PrismaService } from '../../shared/prisma.service.js';
import type { ExternalReferenceService } from './external-reference.service.js';
import { SyncTransfersUseCase } from './sync-transfers.usecase.js';

const JUGADORES = new Map([
  ['10', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'],
  ['11', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'],
]);
const CLUBES = new Map([['2553', 'cccccccc-cccc-cccc-cccc-cccccccccccc']]);

function armar(movimientos: ProviderTransfer[]) {
  let creadas: Array<Record<string, unknown>> = [];
  let duplicadosIgnorados = false;
  const prisma = {
    transfer: {
      /* Sin nada escrito todavía: cada caso de acá mira lo que entra, no lo que ya estaba. */
      findMany: () => Promise.resolve([]),
      createMany: ({ data, skipDuplicates }: { data: Array<Record<string, unknown>>; skipDuplicates?: boolean }) => {
        creadas = data;
        duplicadosIgnorados = skipDuplicates === true;
        return Promise.resolve({ count: data.length });
      },
    },
  } as unknown as PrismaService;
  const refs = {
    resolveMany: (_p: string, tipo: string) =>
      Promise.resolve(tipo === 'player' ? JUGADORES : CLUBES),
  } as unknown as ExternalReferenceService;
  const provider = { name: 'api-football', getTransfers: () => Promise.resolve(movimientos) } as never;

  return {
    uso: new SyncTransfersUseCase(prisma, refs, provider),
    leer: () => creadas,
    ignoraDuplicados: () => duplicadosIgnorados,
  };
}

const pase = (extra: Partial<ProviderTransfer> = {}): ProviderTransfer => ({
  playerRef: '10',
  fecha: '2026-04-05',
  clase: 'libre',
  monto: null,
  entraARef: '2553',
  entraANombre: 'Alianza Lima',
  saleDeRef: '9999',
  saleDeNombre: 'Sport Boys',
  ...extra,
});

describe('SyncTransfersUseCase', () => {
  it('resuelve al jugador y al club que sí conoce', async () => {
    const { uso, leer } = armar([pase()]);
    expect(await uso.execute('2553')).toBe(1);
    expect(leer()[0]).toMatchObject({
      playerId: JUGADORES.get('10'),
      entraATeamId: CLUBES.get('2553'),
      entraANombre: 'Alianza Lima',
      clase: 'libre',
    });
  });

  /* La mayoría de los pases cruzan a ligas que no cubrimos: el nombre queda, la llave no. */
  it('guarda el club de afuera por su nombre, sin llave', async () => {
    const { uso, leer } = armar([pase()]);
    await uso.execute('2553');
    expect(leer()[0]).toMatchObject({ saleDeTeamId: null, saleDeNombre: 'Sport Boys' });
  });

  it('descarta el movimiento de un jugador que Athena no tiene', async () => {
    const { uso, leer } = armar([pase({ playerRef: '404' })]);
    expect(await uso.execute('2553')).toBe(0);
    expect(leer()).toEqual([]);
  });

  /*
   * El mismo pase llega dos veces, una por el club que compró y otra por el que vendió. Por eso se
   * inserta ignorando lo repetido en lugar de borrar por equipo, que tiraría los del otro lado.
   */
  it('inserta ignorando lo que ya está', async () => {
    const { uso, ignoraDuplicados } = armar([pase()]);
    await uso.execute('2553');
    expect(ignoraDuplicados()).toBe(true);
  });

  it('la fecha va sin hora, en UTC', async () => {
    const { uso, leer } = armar([pase({ fecha: '2026-04-05' })]);
    await uso.execute('2553');
    expect((leer()[0]!.fecha as Date).toISOString()).toBe('2026-04-05T00:00:00.000Z');
  });
});

describe('SyncTransfersUseCase · el mismo pase fechado distinto', () => {
  /*
   * El proveedor fecha el movimiento según a qué club se le pregunte: Correa sale de Botafogo el 5
   * de agosto si se pide Botafogo y el 6 si se pide Estudiantes. Son dos respuestas distintas, así
   * que la deduplicación del mapeador no lo ve y hay que mirar lo que ya está escrito.
   */
  function conLoQueYaEsta(existentes: Array<{ fecha: string }>, entrante: ProviderTransfer) {
    let creadas: Array<Record<string, unknown>> = [];
    const prisma = {
      transfer: {
        findMany: () =>
          Promise.resolve(
            existentes.map((e) => ({
              playerId: JUGADORES.get('10'),
              fecha: new Date(`${e.fecha}T00:00:00Z`),
              entraANombre: 'Estudiantes L.P.',
              saleDeNombre: 'Botafogo',
            })),
          ),
        createMany: ({ data }: { data: Array<Record<string, unknown>> }) => (
          (creadas = data), Promise.resolve({ count: data.length })
        ),
      },
    } as unknown as PrismaService;
    const refs = {
      resolveMany: (_p: string, tipo: string) =>
        Promise.resolve(tipo === 'player' ? JUGADORES : new Map()),
    } as unknown as ExternalReferenceService;
    const provider = { name: 'api-football', getTransfers: () => Promise.resolve([entrante]) } as never;
    return { uso: new SyncTransfersUseCase(prisma, refs, provider), leer: () => creadas };
  }

  const salida = (fecha: string): ProviderTransfer => ({
    playerRef: '10',
    fecha,
    clase: 'traspaso',
    monto: null,
    entraARef: null,
    entraANombre: 'Estudiantes L.P.',
    saleDeRef: null,
    saleDeNombre: 'Botafogo',
  });

  it('no vuelve a escribir un pase que ya está con un día de diferencia', async () => {
    const { uso, leer } = conLoQueYaEsta([{ fecha: '2026-08-05' }], salida('2026-08-06'));
    expect(await uso.execute('2553')).toBe(0);
    expect(leer()).toEqual([]);
  });

  /* Un pase entre los mismos clubes años después sí es otro pase. */
  it('escribe el que está lejos en el tiempo', async () => {
    const { uso, leer } = conLoQueYaEsta([{ fecha: '2024-01-10' }], salida('2026-08-06'));
    expect(await uso.execute('2553')).toBe(1);
    expect(leer()).toHaveLength(1);
  });
});
