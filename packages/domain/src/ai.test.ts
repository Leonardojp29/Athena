import { describe, expect, it } from 'vitest';
import { findUnsupportedNumbers } from './ai.js';

const evidence = {
  score: { home: 3, away: 1 },
  events: [{ minute: 55, player: 'Lamine Yamal' }],
  standings: { position: 2, points: 40 },
};

describe('findUnsupportedNumbers', () => {
  it('accepts a narrative that only cites numbers present in the evidence', () => {
    const narrative = 'Ganó 3-1 con un gol al minuto 55 y quedó 2° con 40 puntos.';
    expect(findUnsupportedNumbers(narrative, evidence)).toEqual([]);
  });

  it('flags invented figures', () => {
    const narrative = 'Dominó con 68% de posesión y 14 remates.';
    expect(findUnsupportedNumbers(narrative, evidence)).toEqual(['68', '14']);
  });

  it('reads numbers embedded in evidence strings', () => {
    const narrative = 'Cerró una racha de 7 partidos.';
    expect(findUnsupportedNumbers(narrative, { form: 'últimos 7 partidos: GGEPG' })).toEqual([]);
  });

  it('returns each offending number once', () => {
    expect(findUnsupportedNumbers('99 y 99 otra vez', evidence)).toEqual(['99']);
  });
});
