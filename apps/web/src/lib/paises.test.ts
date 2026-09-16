import { describe, expect, it } from 'vitest';
import { nombreFase } from './paises';

/*
 * Los casos son las formas reales que hay en la base, contadas antes de escribir la función: sin
 * eso se traduce lo que uno imagina y no lo que el proveedor manda.
 */
describe('nombreFase', () => {
  it('deja pasar una fase suelta', () => {
    expect(nombreFase('Apertura')).toBe('Apertura');
  });

  it('quita el torneo que viene con dos puntos', () => {
    expect(nombreFase('Primera: Clausura')).toBe('Clausura');
  });

  it('quita el torneo que viene con coma, con y sin espacio antes', () => {
    expect(nombreFase('CAF Champions League , Group A')).toBe('Grupo A');
    expect(nombreFase('Liga 1 2025, Apertura')).toBe('Apertura');
  });

  /* Solo la primera coma: lo de después sí dice algo y se conserva entero. */
  it('conserva las partes que quedan tras el torneo', () => {
    expect(nombreFase('Primera Division 2025, Torneo Intermedio, Group B')).toBe(
      'Torneo Intermedio · Grupo B',
    );
    expect(nombreFase('UEFA Nations League , League B, Group 3')).toBe('Liga B · Grupo 3');
  });

  it('traduce lo que el proveedor escribe en inglés', () => {
    expect(nombreFase('Liga 1 2025, Overall')).toBe('Tabla general');
    expect(nombreFase('Serie A 2025, Championship Round')).toBe('Ronda por el título');
    expect(nombreFase('Serie A 2025, Relegation Round')).toBe('Ronda por el descenso');
    expect(nombreFase('AFC Champions League Elite , West')).toBe('Oeste');
  });

  it('parte también por el guion', () => {
    expect(nombreFase('Apertura - Group A')).toBe('Apertura · Grupo A');
  });

  /* El año ya se ve al lado; repetirlo dentro de la etiqueta es ruido. */
  it('quita el año repetido', () => {
    expect(nombreFase('Primera Division 2025, Clausura 2025')).toBe('Clausura');
  });

  it('sin nada que decir, se llama Tabla', () => {
    expect(nombreFase('Liga 1 2025,')).toBe('Tabla');
  });
});
