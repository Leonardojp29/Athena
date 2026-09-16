import { describe, expect, it } from 'vitest';
import { formatear, lideresDeFila, type DefinicionDeFila } from './comparar';

const masEsMejor: DefinicionDeFila = { clave: 'goals', etiqueta: 'Goles' };
const menosEsMejor: DefinicionDeFila = { clave: 'position', etiqueta: 'Posición', menosEsMejor: true };
const neutral: DefinicionDeFila = { clave: 'played', etiqueta: 'Jugados', neutral: true };

describe('lideresDeFila', () => {
  it('marca al más alto cuando más es mejor', () => {
    expect([...lideresDeFila([3, 9, 1], masEsMejor)]).toEqual([1]);
  });

  it('marca al más bajo cuando menos es mejor', () => {
    expect([...lideresDeFila([11, 1, 4], menosEsMejor)]).toEqual([1]);
  });

  it('marca a los dos cuando empatan arriba', () => {
    expect([...lideresDeFila([9, 9, 1], masEsMejor)]).toEqual([0, 1]);
  });

  /* Marcar a todos es lo mismo que no marcar a ninguno, y encima ensucia la fila. */
  it('no marca a nadie si empatan todos', () => {
    expect(lideresDeFila([5, 5, 5], masEsMejor).size).toBe(0);
  });

  it('no marca a nadie en una fila neutral', () => {
    expect(lideresDeFila([1, 9], neutral).size).toBe(0);
  });

  it('no marca a nadie si solo uno tiene dato', () => {
    expect(lideresDeFila([7, null], masEsMejor).size).toBe(0);
  });

  it('ignora a los que no tienen dato', () => {
    expect([...lideresDeFila([null, 2, 8], masEsMejor)]).toEqual([2]);
  });
});

describe('formatear', () => {
  it('sin dato escribe una raya y no un cero', () => {
    expect(formatear(null, masEsMejor)).toBe('–');
    expect(formatear(undefined, masEsMejor)).toBe('–');
  });

  /* En Perú el separador de miles es la coma: 4.525 se leería como cuatro con medio. */
  it('redondea los enteros y agrupa los miles', () => {
    expect(formatear(4525.4, masEsMejor)).toBe('4,525');
    expect(formatear(55, masEsMejor)).toBe('55');
  });

  it('respeta los decimales y el sufijo declarados', () => {
    expect(formatear(1.0857, { clave: 'x', etiqueta: 'x', decimales: 2 })).toBe('1.09');
    expect(formatear(78.4, { clave: 'x', etiqueta: 'x', sufijo: '%' })).toBe('78%');
  });
});
