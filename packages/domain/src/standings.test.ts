import { describe, expect, it } from 'vitest';
import { faseDeJornada, gruposVigentes } from './standings.js';

describe('faseDeJornada', () => {
  it('quita el número de jornada y deja la fase', () => {
    expect(faseDeJornada('Clausura - 4')).toBe('Clausura');
    expect(faseDeJornada('Apertura - 17')).toBe('Apertura');
    expect(faseDeJornada('Regular Season - 18')).toBe('Regular Season');
    expect(faseDeJornada('Group Stage - 6')).toBe('Group Stage');
  });

  it('deja intactas las llaves, que no llevan número', () => {
    expect(faseDeJornada('Final')).toBe('Final');
    expect(faseDeJornada('Round of 16')).toBe('Round of 16');
    expect(faseDeJornada('Torneo Intermedio - Final')).toBe('Torneo Intermedio - Final');
  });

  it('sin jornada no inventa fase', () => {
    expect(faseDeJornada(null)).toBeNull();
    expect(faseDeJornada('   ')).toBeNull();
  });
});

/*
 * Cada caso sale de datos reales de la temporada 2026, porque el valor de esto es acertarle a las
 * competencias que existen y no a un ejemplo cómodo.
 */
describe('gruposVigentes', () => {
  it('prioriza el Clausura mientras el Apertura ya terminó (Liga 1)', () => {
    expect(gruposVigentes('Clausura - 4', ['Apertura', 'Clausura'])).toEqual(['Clausura']);
  });

  it('se queda con las dos zonas de la fase en juego (Liga Profesional Argentina)', () => {
    const labels = [
      'Apertura - Group A',
      'Apertura - Group B',
      'Clausura - Group A',
      'Clausura - Group B',
    ];
    expect(gruposVigentes('Clausura - 4', labels)).toEqual([
      'Clausura - Group A',
      'Clausura - Group B',
    ]);
  });

  it('encuentra la fase aunque la tabla la prefije (Uruguay)', () => {
    const labels = [
      'Primera: Apertura',
      'Primera: Clausura',
      'Primera: Promedios',
      'Primera: Tabla Anual',
      'Primera: Torneo Intermedio',
    ];
    expect(gruposVigentes('Clausura - 1', labels)).toEqual(['Primera: Clausura']);
  });

  it('no prioriza nada cuando los grupos son simultáneos (Libertadores)', () => {
    const grupos = ['Group A', 'Group B', 'Group C', 'Group D'];
    expect(gruposVigentes('Group Stage - 6', grupos)).toEqual([]);
    expect(gruposVigentes('Round of 16', grupos)).toEqual([]);
  });

  it('no prioriza nada entre conferencias (MLS)', () => {
    const conferencias = ['Eastern Conference', 'Western Conference'];
    expect(gruposVigentes('Regular Season - 18', conferencias)).toEqual([]);
  });

  it('una sola tabla no se segmenta', () => {
    expect(gruposVigentes('Regular Season - 22', [''])).toEqual([]);
    expect(gruposVigentes('Clausura - 4', ['Clausura'])).toEqual([]);
  });

  it('sin jornada devuelve vacío en lugar de adivinar', () => {
    expect(gruposVigentes(null, ['Apertura', 'Clausura'])).toEqual([]);
  });
});
