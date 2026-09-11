import { describe, expect, it, vi } from 'vitest';
import { SearchService } from './search.service.js';

interface Consulta {
  sql: string;
  query: string;
}

function servicio(filasPorTabla: Record<string, unknown[]>) {
  const consultas: Consulta[] = [];
  const prisma = {
    $queryRawUnsafe: vi.fn((sql: string, query: string) => {
      consultas.push({ sql, query });
      const tabla = /FROM (\w+) f,/.exec(sql)?.[1] ?? '';
      return Promise.resolve(filasPorTabla[tabla] ?? []);
    }),
  };
  const flags = { isEnabled: vi.fn().mockResolvedValue(false) };
  const embedder = { model: 'falso', embed: vi.fn() };
  const service = new SearchService(
    prisma as never,
    {} as never,
    flags as never,
    embedder as never,
  );
  return { service, consultas, flags, embedder };
}

const fila = (name: string, score: number) => ({
  id: name,
  name,
  slug: name,
  imageUrl: null,
  subtitle: null,
  score,
});

describe('SearchService', () => {
  it('una consulta vacía no toca la base', async () => {
    const { service, consultas } = servicio({});
    expect(await service.suggest('   ')).toEqual([]);
    expect(consultas).toHaveLength(0);
  });

  it('con una o dos letras busca solo por prefijo', async () => {
    const { service, consultas } = servicio({});
    await service.suggest('u');
    expect(consultas).toHaveLength(3);
    for (const { sql } of consultas) {
      expect(sql).toContain("LIKE c.q || '%'");
      expect(sql).not.toContain('% c.q');
    }
  });

  it('de tres letras en adelante suma el parecido difuso y el infijo', async () => {
    const { service, consultas } = servicio({});
    await service.suggest('boc');
    for (const { sql } of consultas) {
      expect(sql).toContain('% c.q');
      expect(sql).toContain("LIKE '%' || c.q || '%'");
    }
  });

  it('a igual parecido, la competencia pesa más que el equipo y el equipo más que el jugador', async () => {
    const { service } = servicio({
      competitions: [fila('copa', 0.5)],
      teams: [fila('club', 0.5)],
      players: [fila('jugador', 0.5)],
    });
    expect((await service.suggest('x')).map((h) => h.name)).toEqual(['copa', 'club', 'jugador']);
  });

  it('el acierto por nombre nunca queda por debajo de uno semántico', async () => {
    const { service } = servicio({ players: [fila('jugador', 0.4)] });
    const [hit] = await service.suggest('x');
    expect(hit?.score).toBeGreaterThan(1);
    expect(hit?.matchedBy).toBe('nombre');
  });

  it('sugerir nunca consulta el flag semántico', async () => {
    const { service, flags, embedder } = servicio({ teams: [fila('club', 0.9)] });
    await service.suggest('alianza');
    expect(flags.isEnabled).not.toHaveBeenCalled();
    expect(embedder.embed).not.toHaveBeenCalled();
  });

  it('una consulta corta no dispara la vía semántica aunque haya pocos resultados', async () => {
    const { service, flags } = servicio({ teams: [fila('club', 0.9)] });
    await service.search('u');
    expect(flags.isEnabled).not.toHaveBeenCalled();
  });
});
