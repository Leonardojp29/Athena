import { describe, expect, it } from 'vitest';
import { describirRonda, ordenarRondas } from './rounds.js';

describe('describirRonda', () => {
  it('traduce y ordena las llaves de una copa', () => {
    expect(describirRonda('Round of 16')).toMatchObject({ label: 'Octavos', eliminatoria: true });
    expect(describirRonda('Quarter-finals')).toMatchObject({ label: 'Cuartos de final' });
    expect(describirRonda('Semi-finals')).toMatchObject({ label: 'Semifinales' });
    expect(describirRonda('Final')).toMatchObject({ label: 'Final', rank: 60 });
  });

  it('conserva la fecha en la fase de grupos y no la inventa en una llave', () => {
    expect(describirRonda('Group Stage - 6').label).toBe('Fase de grupos · fecha 6');
    expect(describirRonda('Group Stage - 6').eliminatoria).toBe(false);
    expect(describirRonda('Round of 16').label).toBe('Octavos');
  });

  it('reconoce las fases previas de la Libertadores', () => {
    expect(describirRonda('Qualification Round 1').label).toBe('Fase previa 1');
    expect(describirRonda('Qualification Round 3').rank).toBe(3);
  });

  /* El orden del fútbol: la final va última aunque alfabéticamente sea la primera. */
  it('ordena por el camino del torneo, no por el alfabeto', () => {
    const orden = ordenarRondas([
      'Final',
      'Group Stage - 1',
      'Round of 16',
      'Quarter-finals',
      'Qualification Round 2',
    ]).map((r) => r.label);

    expect(orden).toEqual([
      'Fase previa 2',
      'Fase de grupos · fecha 1',
      'Octavos',
      'Cuartos de final',
      'Final',
    ]);
  });

  it('lo que no reconoce lo deja como vino, sin adivinar', () => {
    expect(describirRonda('Copa Perú - Etapa Nacional')).toMatchObject({
      label: 'Copa Perú - Etapa Nacional',
      rank: 99,
      eliminatoria: false,
    });
  });
});
