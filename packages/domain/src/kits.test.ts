import { describe, expect, it } from 'vitest';
import { kitTitular, MUESTRAS_MINIMAS } from './kits.js';

const dia = (n: number) => new Date(2026, 0, n);

describe('kitTitular', () => {
  it('elige la camiseta que más se repite de local', () => {
    const muestras = [
      { color: '75b5ee', cuando: dia(1) },
      { color: '75b5ee', cuando: dia(8) },
      { color: '111111', cuando: dia(15) },
      { color: '75b5ee', cuando: dia(22) },
    ];
    expect(kitTitular(muestras)).toBe('75b5ee');
  });

  /*
   * Es el caso que originó todo: con dos partidos, el del centenario o el de la camiseta especial
   * queda como identidad del club para siempre.
   */
  it('no decide con menos de tres muestras', () => {
    expect(kitTitular([{ color: 'ffffff', cuando: dia(1) }])).toBeNull();
    expect(
      kitTitular([
        { color: 'ffffff', cuando: dia(1) },
        { color: '040009', cuando: dia(8) },
      ]),
    ).toBeNull();
    expect(MUESTRAS_MINIMAS).toBe(3);
  });

  /* Un cambio de camiseta gana con el tiempo: empatadas, manda la más reciente. */
  it('desempata por la más reciente', () => {
    const muestras = [
      { color: 'aaaaaa', cuando: dia(1) },
      { color: 'bbbbbb', cuando: dia(8) },
      { color: 'aaaaaa', cuando: dia(15) },
      { color: 'bbbbbb', cuando: dia(22) },
    ];
    expect(kitTitular(muestras)).toBe('bbbbbb');
  });
});
