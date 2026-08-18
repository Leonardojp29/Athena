import { describe, expect, it, vi } from 'vitest';
import { bulkUpdate, bulkUpdatePlayers, bulkUpsert } from './bulk-upsert.js';
import type { PrismaService } from '../../shared/prisma.service.js';

/*
 * Estas funciones arman SQL a mano, así que lo que hay que verificar es exactamente eso: que
 * los valores viajan como parámetros, que los identificadores se validan y que nada del
 * proveedor termina interpolado.
 */
function fakePrisma() {
  const llamadas: Array<{ sql: string; params: unknown[] }> = [];
  const prisma = {
    $executeRawUnsafe: vi.fn(async (sql: string, ...params: unknown[]) => {
      llamadas.push({ sql, params });
      return params.length;
    }),
  } as unknown as PrismaService;
  return { prisma, llamadas };
}

describe('bulkUpsert', () => {
  it('no toca la base sin filas', async () => {
    const { prisma, llamadas } = fakePrisma();
    expect(await bulkUpsert(prisma, { table: 'venues', conflict: ['id'], update: [], rows: [] })).toBe(0);
    expect(llamadas).toHaveLength(0);
  });

  it('arma un solo INSERT con todas las filas', async () => {
    const { prisma, llamadas } = fakePrisma();
    await bulkUpsert(prisma, {
      table: 'squad_memberships',
      conflict: ['team_id', 'player_id', 'year'],
      update: ['shirt_number'],
      rows: [
        { team_id: 't1', player_id: 'p1', year: 2026, shirt_number: 9 },
        { team_id: 't1', player_id: 'p2', year: 2026, shirt_number: 10 },
      ],
      generateId: true,
      touch: true,
    });

    expect(llamadas).toHaveLength(1);
    const { sql, params } = llamadas[0] as { sql: string; params: unknown[] };
    expect(sql).toContain('INSERT INTO "squad_memberships"');
    expect(sql).toContain('ON CONFLICT ("team_id", "player_id", "year")');
    expect(sql).toContain('"shirt_number" = EXCLUDED."shirt_number"');
    expect(sql).toContain('"updated_at" = now()');
    // dos filas × (id + cuatro columnas); updated_at va como now(), no como parámetro
    expect(params).toHaveLength(10);
    expect(params).toContain(9);
    expect(params).toContain('p2');
  });

  it('parametriza los valores en lugar de interpolarlos', async () => {
    const { prisma, llamadas } = fakePrisma();
    const nombre = "Robert'); DROP TABLE players; --";
    await bulkUpsert(prisma, {
      table: 'squad_memberships',
      conflict: ['team_id'],
      update: ['position'],
      rows: [{ team_id: 't1', position: nombre }],
    });

    const { sql, params } = llamadas[0] as { sql: string; params: unknown[] };
    expect(sql).not.toContain('DROP TABLE');
    expect(params).toContain(nombre);
  });

  it('serializa las columnas jsonb y las castea', async () => {
    const { prisma, llamadas } = fakePrisma();
    await bulkUpsert(prisma, {
      table: 'match_lineups',
      conflict: ['match_id', 'team_id'],
      update: ['start_xi'],
      rows: [{ match_id: 'm1', team_id: 't1', start_xi: { minutes: 90 } }],
      jsonColumns: ['start_xi'],
    });

    const { sql, params } = llamadas[0] as { sql: string; params: unknown[] };
    expect(sql).toContain('::jsonb');
    expect(params).toContain('{"minutes":90}');
  });

  it('convierte undefined en null para no romper el INSERT', async () => {
    const { prisma, llamadas } = fakePrisma();
    await bulkUpsert(prisma, {
      table: 'squad_memberships',
      conflict: ['team_id'],
      update: ['position'],
      rows: [{ team_id: 't1', position: undefined }],
    });

    expect((llamadas[0] as { params: unknown[] }).params).toEqual(['t1', null]);
  });

  it('castea los uuid: Postgres no los infiere dentro de un VALUES', async () => {
    const { prisma, llamadas } = fakePrisma();
    await bulkUpsert(prisma, {
      table: 'squad_memberships',
      conflict: ['team_id', 'player_id'],
      update: ['year'],
      rows: [{ team_id: 't1', player_id: 'p1', year: 2026 }],
      generateId: true,
    });

    const { sql } = llamadas[0] as { sql: string };
    // id, team_id y player_id se castean; `year` es un entero y no lleva nada
    expect(sql.match(/::uuid/g)).toHaveLength(3);
    expect(sql).toContain('$4)');
  });

  it('rechaza un identificador que no sea un nombre de columna', async () => {
    const { prisma } = fakePrisma();
    await expect(
      bulkUpsert(prisma, {
        table: 'players"; DROP TABLE players; --',
        conflict: ['id'],
        update: [],
        rows: [{ id: 'x' }],
      }),
    ).rejects.toThrow(/Identificador inválido/);
  });

  it('deduplica por la clave del conflicto: un ON CONFLICT no puede tocar la fila dos veces', async () => {
    const { prisma, llamadas } = fakePrisma();
    await bulkUpsert(prisma, {
      table: 'match_player_statistics',
      conflict: ['match_id', 'player_id'],
      update: ['minutes_played'],
      rows: [
        { match_id: 'm1', player_id: 'p1', minutes_played: 45 },
        { match_id: 'm1', player_id: 'p1', minutes_played: 90 },
        { match_id: 'm1', player_id: 'p2', minutes_played: 90 },
      ],
    });

    const { params } = llamadas[0] as { params: unknown[] };
    // dos filas × tres columnas, y gana el último valor del proveedor
    expect(params).toHaveLength(6);
    expect(params).not.toContain(45);
  });

  it('parte en lotes cuando hay más filas que el tope', async () => {
    const { prisma, llamadas } = fakePrisma();
    await bulkUpsert(prisma, {
      table: 'squad_memberships',
      conflict: ['player_id'],
      update: ['year'],
      rows: Array.from({ length: 1200 }, (_, i) => ({ player_id: `p${i}`, year: 2026 })),
    });
    expect(llamadas).toHaveLength(3);
  });
});

describe('bulkUpdatePlayers', () => {
  it('protege con COALESCE lo que el proveedor no sabe', async () => {
    const { prisma, llamadas } = fakePrisma();
    await bulkUpdatePlayers(prisma, [
      {
        id: 'p1',
        name: 'J. Alarcón',
        full_name: null,
        birth_date: null,
        nationality: null,
        height_cm: null,
        position: null,
        photo_url: null,
      },
    ]);

    const { sql } = llamadas[0] as { sql: string };
    expect(sql).toContain('UPDATE "players"');
    // el nombre corto sí gana; el resto solo si trae valor
    expect(sql).toContain('name = v.name,');
    expect(sql).toContain('full_name = COALESCE(v.full_name, t.full_name)');
    expect(sql).toContain('birth_date = COALESCE(v.birth_date, t.birth_date)');
  });

  it('sin coalesce sobrescribe, con coalesce protege', async () => {
    const { prisma, llamadas } = fakePrisma([]);
    await bulkUpdate(prisma, {
      table: 'teams',
      columns: [
        { name: 'id', cast: '::uuid' },
        { name: 'name', cast: '::text' },
        { name: 'founded', cast: '::int' },
      ],
      rows: [{ id: 't1', name: 'Alianza Lima', founded: null }],
      coalesce: ['founded'],
    });

    const { sql } = llamadas[0] as { sql: string };
    expect(sql).toContain('name = v.name');
    expect(sql).toContain('founded = COALESCE(v.founded, t.founded)');
    expect(sql).toContain('updated_at = now()');
  });

  it('rechaza un identificador inventado en las columnas', async () => {
    const { prisma } = fakePrisma([]);
    await expect(
      bulkUpdate(prisma, {
        table: 'teams',
        columns: [{ name: 'id; DROP TABLE teams; --', cast: '::uuid' }],
        rows: [{ id: 'x' }],
      }),
    ).rejects.toThrow(/Identificador inválido/);
  });

  it('no emite nada sin cambios', async () => {
    const { prisma, llamadas } = fakePrisma();
    expect(await bulkUpdatePlayers(prisma, [])).toBe(0);
    expect(llamadas).toHaveLength(0);
  });
});
