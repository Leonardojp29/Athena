import { describe, expect, it } from 'vitest';
import {
  describirRonda,
  escaleraDesde,
  etapaDeRonda,
  ordenarEtapas,
  ordenarRondas,
} from './rounds.js';

describe('describirRonda', () => {
  it('traduce y ordena las llaves de una copa', () => {
    expect(describirRonda('Round of 16')).toMatchObject({
      label: 'Octavos de final',
      eliminatoria: true,
      etapa: 'final',
    });
    expect(describirRonda('Quarter-finals')).toMatchObject({ label: 'Cuartos de final' });
    expect(describirRonda('Semi-finals')).toMatchObject({ label: 'Semifinales' });
    expect(describirRonda('Semi-Finals')).toMatchObject({ label: 'Semifinales' });
    expect(describirRonda('Final')).toMatchObject({ label: 'Final', etapa: 'final' });
    expect(describirRonda('Finals')).toMatchObject({ label: 'Final', etapa: 'final' });
  });

  /*
   * Así llama el proveedor a los octavos y a los dieciseisavos. Caían en la regla de la final, y el
   * Mundial de Clubes 2025 mostraba "Final" dos veces con los octavos después de la semifinal.
   */
  it('8th Finals son los octavos y 16th Finals los dieciseisavos, no la final', () => {
    expect(describirRonda('8th Finals')).toMatchObject({ label: 'Octavos de final', etapa: 'final' });
    expect(describirRonda('16th Finals')).toMatchObject({ label: 'Dieciseisavos', etapa: 'final' });

    const cwc = ordenarRondas([
      'Group Stage - 1',
      'Quarter-finals',
      'Semi-finals',
      '8th Finals',
      'Final',
      '5th Place Final',
    ]).map((r) => r.label);
    expect(cwc).toEqual([
      'Fase de grupos · fecha 1',
      'Octavos de final',
      'Cuartos de final',
      'Semifinales',
      'Definición de puestos',
      'Final',
    ]);
  });

  /*
   * El repechaje de la fase liga se juega en febrero, después de los grupos; la previa de la UEFA se
   * juega en agosto, antes. Los dos strings terminan en "Play-offs" y compartían regla y rango.
   */
  it('separa el repechaje posterior a la fase liga de la previa de agosto', () => {
    expect(describirRonda('Knockout Round Play-offs')).toMatchObject({
      label: 'Repechaje',
      etapa: 'final',
    });
    expect(describirRonda('Play-offs')).toMatchObject({
      label: 'Repechaje de acceso',
      etapa: 'previa',
    });

    const uefa = ordenarRondas([
      '1st Qualifying Round',
      'Play-offs',
      'League Stage - 8',
      'Knockout Round Play-offs',
      'Round of 16',
      'Final',
    ]).map((r) => r.label);
    expect(uefa).toEqual([
      'Fase previa 1',
      'Repechaje de acceso',
      'Fase liga · fecha 8',
      'Repechaje',
      'Octavos de final',
      'Final',
    ]);
  });

  it('reconoce las fases previas con los dos vocabularios de la Libertadores', () => {
    /* 2026 en adelante. */
    expect(describirRonda('Qualification Round 1').label).toBe('Fase previa 1');
    expect(describirRonda('Qualification Round 3')).toMatchObject({
      label: 'Fase previa 3',
      etapa: 'previa',
    });
    /* Hasta 2025, y hasta ahora quedaban fuera del cuadro. */
    expect(describirRonda('1st Round')).toMatchObject({ label: 'Fase previa 1', etapa: 'previa' });
    expect(describirRonda('3rd Round')).toMatchObject({ label: 'Fase previa 3', etapa: 'previa' });
  });

  it('la fase liga del formato nuevo es fase de grupos', () => {
    expect(describirRonda('League Stage - 8')).toMatchObject({
      label: 'Fase liga · fecha 8',
      etapa: 'grupos',
      eliminatoria: false,
    });
    expect(describirRonda('League Phase East - 3')).toMatchObject({
      label: 'Fase liga · fecha 3',
      etapa: 'grupos',
    });
    expect(describirRonda('Ranking of second-placed teams - 2')).toMatchObject({
      label: 'Mejores segundos · fecha 2',
      etapa: 'grupos',
    });
  });

  it('distingue las dos preliminares que la CAF juega en la misma temporada', () => {
    expect(describirRonda('1st Preliminary Round').label).toBe('Preliminar 1');
    expect(describirRonda('2nd Preliminary Round').label).toBe('Preliminar 2');
    expect(describirRonda('Preliminary round').label).toBe('Ronda preliminar');
    expect(describirRonda('1st Preliminary Round').rank).toBeLessThan(
      describirRonda('2nd Preliminary Round').rank,
    );
  });

  it('conserva la fecha en la fase de grupos y la letra cuando viene en la ronda', () => {
    expect(describirRonda('Group Stage - 6').label).toBe('Fase de grupos · fecha 6');
    expect(describirRonda('Group Stage - 6').eliminatoria).toBe(false);
    /* Temporadas viejas: la letra del grupo viaja dentro del nombre de la ronda. */
    expect(describirRonda('Group H - 6').label).toBe('Grupo H · fecha 6');
    expect(describirRonda('Group A - 1')).toMatchObject({ label: 'Grupo A · fecha 1', etapa: 'grupos' });
  });

  it('el tercer puesto no es la final', () => {
    expect(describirRonda('3rd Place Final').label).toBe('Tercer puesto');
    expect(describirRonda('Third place').label).toBe('Tercer puesto');
    expect(describirRonda('3rd Place Final').rank).toBeLessThan(describirRonda('Final').rank);
  });

  it('lo que no reconoce lo deja como vino, sin adivinar y fuera del cuadro', () => {
    expect(describirRonda('Copa Perú - Etapa Nacional')).toMatchObject({
      label: 'Copa Perú - Etapa Nacional',
      rank: 99,
      eliminatoria: false,
      etapa: null,
    });
    /* Basura del proveedor: mejor afuera que inventada. */
    expect(describirRonda('R66244').etapa).toBeNull();
  });
});

describe('etapas', () => {
  it('dice a qué etapa pertenece una ronda', () => {
    expect(etapaDeRonda('Round of 16')).toBe('final');
    expect(etapaDeRonda('Group Stage - 3')).toBe('grupos');
    expect(etapaDeRonda('2nd Qualifying Round')).toBe('previa');
    expect(etapaDeRonda(null)).toBeNull();
  });

  /*
   * Lo que hace que la página se reordene sola: mientras se juegan los octavos manda el cuadro, y
   * cuando arranca la fase de grupos de la temporada siguiente manda la fase de grupos.
   */
  it('pone primero la etapa en juego y después el resto por importancia', () => {
    expect(ordenarEtapas('final')).toEqual(['final', 'grupos', 'previa']);
    expect(ordenarEtapas('grupos')).toEqual(['grupos', 'final', 'previa']);
    expect(ordenarEtapas('previa')).toEqual(['previa', 'final', 'grupos']);
    expect(ordenarEtapas(null)).toEqual(['final', 'grupos', 'previa']);
  });
});

describe('escaleraDesde', () => {
  /* Con los octavos en marcha ya se sabe que vienen cuartos, semis y final. */
  it('deduce el camino que falta hasta la final', () => {
    expect(escaleraDesde(8)).toEqual([
      { label: 'Cuartos de final', rank: 50, llaves: 4 },
      { label: 'Semifinales', rank: 60, llaves: 2 },
      { label: 'Final', rank: 70, llaves: 1 },
    ]);
    expect(escaleraDesde(2)).toEqual([{ label: 'Final', rank: 70, llaves: 1 }]);
    expect(escaleraDesde(1)).toEqual([]);
  });

  it('no inventa una escalera cuando el número de llaves no se parte en dos', () => {
    expect(escaleraDesde(3)).toEqual([]);
    expect(escaleraDesde(6)).toEqual([]);
    expect(escaleraDesde(0)).toEqual([]);
  });
});
