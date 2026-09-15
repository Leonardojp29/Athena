import { describe, expect, it } from 'vitest';
import { calzaNombre } from './nombres.js';

const lista = (...nombres: string[]) => nombres.map((nombre, i) => ({ ref: String(i), nombre }));

describe('calzaNombre', () => {
  /* El proveedor abrevia el nombre de pila dentro de las alineaciones. */
  it('reconoce al abreviado por su apellido', () => {
    const plantel = lista('J. Álvarez', 'L. Messi', 'E. Fernández');

    expect(calzaNombre('Julián Álvarez', plantel)?.nombre).toBe('J. Álvarez');
    expect(calzaNombre('Messi', plantel)?.nombre).toBe('L. Messi');
  });

  /* Dos Martínez en la misma lista: el nombre de pila tiene que desempatar. */
  it('la inicial separa a dos del mismo apellido', () => {
    const plantel = lista('L. Martínez', 'E. Martínez');

    expect(calzaNombre('Lautaro Martínez', plantel)?.nombre).toBe('L. Martínez');
    expect(calzaNombre('Emiliano Martínez', plantel)?.nombre).toBe('E. Martínez');
  });

  /* El caso que lo motivó: buscando "Xavi" entraba Xavi Torres porque estaba primero. */
  it('prefiere el nombre justo sobre el que trae palabras de más', () => {
    expect(calzaNombre('Xavi', lista('Xavi Torres', 'Xavi'))?.nombre).toBe('Xavi');
    expect(calzaNombre('Xavi', lista('Xavi', 'Xavi Torres'))?.nombre).toBe('Xavi');
  });

  it('sin apellido que acierte no inventa una coincidencia', () => {
    expect(calzaNombre('Cafu', lista('J. Cafú Jr', 'M. Moraes'))).not.toBeNull();
    expect(calzaNombre('Zambrano', lista('P. Gallese', 'C. Cueva'))).toBeNull();
  });
});
