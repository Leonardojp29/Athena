import { describe, expect, it } from 'vitest';
import type { PrismaService } from './prisma.service.js';
import { ViewCacheService } from './view-cache.service.js';

interface Fila {
  cuerpo: unknown;
  fresca_hasta: Date;
}

function armar(enLaBase: Fila | null = null) {
  const escrituras: unknown[][] = [];
  const prisma = {
    $queryRaw: () => Promise.resolve(enLaBase ? [enLaBase] : []),
    $executeRaw: (_plantilla: TemplateStringsArray, ...valores: unknown[]) => {
      escrituras.push(valores);
      return Promise.resolve(1);
    },
  } as unknown as PrismaService;
  return { cache: new ViewCacheService(prisma), escrituras };
}

const dentroDe = (segundos: number) => new Date(Date.now() + segundos * 1000);

describe('ViewCacheService', () => {
  it('una vista fría pedida a la vez por varios se calcula una sola vez', async () => {
    const { cache } = armar();
    let calculos = 0;
    const lento = async () => {
      calculos++;
      await new Promise((listo) => setTimeout(listo, 10));
      return 'valor';
    };

    const [a, b, c] = await Promise.all([
      cache.wrap('vista', 60, lento),
      cache.wrap('vista', 60, lento),
      cache.wrap('vista', 60, lento),
    ]);

    expect([a, b, c]).toEqual(['valor', 'valor', 'valor']);
    expect(calculos).toBe(1);
  });

  it('un cálculo que falla no queda guardado ni bloquea al siguiente', async () => {
    const { cache } = armar();
    await expect(cache.wrap('vista', 60, () => Promise.reject(new Error('sin base')))).rejects.toThrow(
      'sin base',
    );
    await expect(cache.wrap('vista', 60, () => Promise.resolve('bueno'))).resolves.toBe('bueno');
  });

  it('borrar obliga a recalcular', async () => {
    const { cache } = armar();
    await cache.wrap('vista', 60, () => Promise.resolve('vieja'));
    cache.borrar('vista');
    await expect(cache.wrap('vista', 60, () => Promise.resolve('nueva'))).resolves.toBe('nueva');
  });

  /* El segundo nivel es lo que hace que una instancia recién arrancada no calcule nada. */
  it('una instancia nueva sirve lo que otra ya calculó, sin recalcular', async () => {
    const { cache } = armar({ cuerpo: { de: 'la base' }, fresca_hasta: dentroDe(60) });
    let calculos = 0;

    const valor = await cache.wrap('vista', 60, () => {
      calculos++;
      return Promise.resolve({ de: 'el cálculo' });
    });

    expect(valor).toEqual({ de: 'la base' });
    expect(calculos).toBe(0);
  });

  it('una vista vencida se sirve igual y se renueva por detrás', async () => {
    const { cache } = armar({ cuerpo: 'vieja', fresca_hasta: dentroDe(-60) });
    let calculos = 0;

    const valor = await cache.wrap('vista', 60, () => {
      calculos++;
      return Promise.resolve('nueva');
    });

    expect(valor).toBe('vieja');
    await new Promise((listo) => setTimeout(listo, 10));
    expect(calculos).toBe(1);
  });

  it('lo calculado se guarda en la base para las demás instancias', async () => {
    const { cache, escrituras } = armar();

    await cache.wrap('competition:eredivisie', 300, () => Promise.resolve({ tabla: [] }));

    expect(escrituras[0]).toContain('competition:eredivisie');
    expect(escrituras[0]).toContain(300);
  });
});
