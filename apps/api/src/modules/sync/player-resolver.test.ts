import { describe, expect, it } from 'vitest';
import { mejorNombre } from './player-resolver.service.js';

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
