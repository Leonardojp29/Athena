import { describe, expect, it } from 'vitest';
import { mejorNombre, slugDesactualizado } from './player-resolver.service.js';

describe('mejorNombre', () => {
  it('no deja que una alineación degrade el nombre completo', () => {
    expect(mejorNombre('Joaquín Mosqueira', 'J. Mosqueira')).toBe('Joaquín Mosqueira');
    expect(mejorNombre('Ángel Di María', 'Á. Di María')).toBe('Ángel Di María');
  });

  it('acepta el nombre completo cuando el guardado es el abreviado', () => {
    expect(mejorNombre('J. Mosqueira', 'Joaquín Mosqueira')).toBe('Joaquín Mosqueira');
  });

  it('acepta cualquier cambio entre nombres del mismo nivel', () => {
    expect(mejorNombre('Joaquin Mosqueira', 'Joaquín Mosqueira')).toBe('Joaquín Mosqueira');
    expect(mejorNombre('J. Mosqueira', 'J. Mosqueira Rojas')).toBe('J. Mosqueira Rojas');
  });

  it('no confunde una inicial con un apellido de una letra ni con una sigla', () => {
    expect(mejorNombre('Hulk', 'Hulk')).toBe('Hulk');
    expect(mejorNombre('Vinícius Júnior', 'Vinicius Jr.')).toBe('Vinicius Jr.');
  });
});

/*
 * Un futbolista que nace de una alineación queda como `j-alarcon`, y hasta que existió la tabla de
 * alias eso era para siempre. Ahora el slug se corrige cuando llega el nombre completo, y el viejo
 * redirige; pero se corrige **solo ese caso**, porque cambiar una URL sin motivo es peor.
 */
describe('slugDesactualizado', () => {
  it('corrige el slug que nació de una inicial cuando llega el nombre completo', () => {
    expect(slugDesactualizado('j-vidales', 'Johnny Vidales')).toBe(true);
  });

  it('no toca el slug que ya tiene nombre de pila', () => {
    expect(slugDesactualizado('johnny-vidales', 'Johnny Vidales')).toBe(false);
    expect(slugDesactualizado('paolo-guerrero', 'Paolo Guerrero')).toBe(false);
  });

  it('espera: con el nombre todavía abreviado, el slug se queda como está', () => {
    expect(slugDesactualizado('j-vidales', 'J. Vidales')).toBe(false);
  });

  it('no confunde un apellido de una letra con una inicial', () => {
    expect(slugDesactualizado('hulk', 'Hulk')).toBe(false);
  });
});
