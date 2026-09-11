import { describe, expect, it } from 'vitest';
import { ViewCacheService } from './view-cache.service.js';

describe('ViewCacheService', () => {
  it('una vista fría pedida a la vez por varios se calcula una sola vez', async () => {
    const cache = new ViewCacheService();
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
    const cache = new ViewCacheService();
    await expect(
      cache.wrap('vista', 60, () => Promise.reject(new Error('sin base'))),
    ).rejects.toThrow('sin base');
    await expect(cache.wrap('vista', 60, () => Promise.resolve('bueno'))).resolves.toBe('bueno');
  });

  it('borrar obliga a recalcular', async () => {
    const cache = new ViewCacheService();
    await cache.wrap('vista', 60, () => Promise.resolve('vieja'));
    cache.borrar('vista');
    await expect(cache.wrap('vista', 60, () => Promise.resolve('nueva'))).resolves.toBe('nueva');
  });
});
