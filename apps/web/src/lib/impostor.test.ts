import { describe, expect, it } from 'vitest';
import { apellidoDe, rotulosDeLaRonda } from './impostor';

describe('el rótulo de la carta', () => {
  it('se queda con el apellido', () => {
    expect(apellidoDe('Lionel Messi')).toBe('Messi');
    expect(apellidoDe('Carles Puyol i Saforcada')).toBe('Saforcada');
  });

  /* El caso que lo destapó: la Argentina de 2021 mostraba «MARÍA» y «PAUL». */
  it('no separa la partícula del apellido', () => {
    expect(apellidoDe('Ángel Di María')).toBe('Di María');
    expect(apellidoDe('Rodrigo De Paul')).toBe('De Paul');
    expect(apellidoDe('Virgil van Dijk')).toBe('van Dijk');
    expect(apellidoDe('Vinícius José de Oliveira Júnior')).toBe('Júnior');
  });

  it('lo que ya es solo apellido se deja como está', () => {
    expect(apellidoDe('Ronaldinho')).toBe('Ronaldinho');
    expect(apellidoDe('Di María')).toBe('Di María');
    expect(apellidoDe('van Dijk')).toBe('van Dijk');
  });

  it('dos apellidos iguales en la misma ronda pasan al nombre completo', () => {
    const rotulos = rotulosDeLaRonda([
      { ref: '1', nombre: 'Lautaro Martínez' },
      { ref: '2', nombre: 'Emiliano Martínez' },
      { ref: '3', nombre: 'Lionel Messi' },
    ]);

    expect(rotulos['1']).toBe('Lautaro Martínez');
    expect(rotulos['2']).toBe('Emiliano Martínez');
    /* El que no se repite se queda corto: alargarlos todos sería castigar a los seis por dos. */
    expect(rotulos['3']).toBe('Messi');
  });
});
