import { describe, expect, it } from 'vitest';
import type { ProviderTrophy } from '@athena/domain';
import type { PrismaService } from '../../shared/prisma.service.js';
import type { ExternalReferenceService } from './external-reference.service.js';
import { SyncTrophiesUseCase } from './sync-trophies.usecase.js';

const JUGADOR = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

function armar(palmares: ProviderTrophy[], resuelve: string | null = JUGADOR) {
  const hechas: string[] = [];
  let creadas: Array<Record<string, unknown>> = [];
  const prisma = {
    $transaction: (ops: unknown[]) => Promise.resolve(ops),
    playerTrophy: {
      deleteMany: () => (hechas.push('borrar'), null),
      createMany: ({ data }: { data: Array<Record<string, unknown>> }) => (
        hechas.push('crear'), (creadas = data), null
      ),
    },
    player: { update: () => (hechas.push('marcar'), null) },
  } as unknown as PrismaService;
  const refs = { resolve: () => Promise.resolve(resuelve) } as unknown as ExternalReferenceService;
  const provider = { name: 'api-football', getTrophies: () => Promise.resolve(palmares) } as never;

  return { uso: new SyncTrophiesUseCase(prisma, refs, provider), hechas, leer: () => creadas };
}

const titulo = (competencia: string, temporada: string | null): ProviderTrophy => ({
  playerRef: '1',
  competencia,
  pais: 'Peru',
  temporada,
  puesto: 'campeon',
});

describe('SyncTrophiesUseCase', () => {
  it('reemplaza el palmarés entero en una sola transacción', async () => {
    const { uso, hechas, leer } = armar([titulo('Liga 1', '2024'), titulo('Copa', null)]);
    expect(await uso.execute('1')).toBe(2);
    expect(hechas).toEqual(['borrar', 'crear', 'marcar']);
    expect(leer()).toHaveLength(2);
    expect(leer()[0]).toMatchObject({ playerId: JUGADOR, competencia: 'Liga 1', temporada: '2024' });
  });

  /* Un título sin año es casi la mitad de los que manda el proveedor: tiene que entrar igual. */
  it('guarda un título sin temporada', async () => {
    const { leer, uso } = armar([titulo('Copa América', null)]);
    await uso.execute('1');
    expect(leer()[0]).toMatchObject({ temporada: null });
  });

  /*
   * Que el proveedor no conteste no significa que el jugador haya dejado de ganar títulos: vaciar
   * una ficha por un hueco del feed es peor que dejarla como estaba.
   */
  it('no borra lo que ya había cuando el proveedor no manda nada', async () => {
    const { uso, hechas } = armar([]);
    expect(await uso.execute('1')).toBe(0);
    expect(hechas).not.toContain('borrar');
  });

  /*
   * Sin la marca, quien no tiene títulos es indistinguible de quien todavía no se revisó, y el
   * relleno vuelve a gastar un pedido por cada uno en cada corrida.
   */
  it('deja constancia de la revisión aunque no haya un solo título', async () => {
    const { uso, hechas } = armar([]);
    await uso.execute('1');
    expect(hechas).toEqual(['marcar']);
  });

  it('no escribe si el jugador no está en Athena', async () => {
    const { uso, hechas } = armar([titulo('Liga 1', '2024')], null);
    expect(await uso.execute('1')).toBe(0);
    expect(hechas).toEqual([]);
  });
});
