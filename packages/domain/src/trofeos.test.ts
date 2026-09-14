import { describe, expect, it } from 'vitest';
import { torneoDeTrofeo } from './trofeos.js';

describe('torneoDeTrofeo', () => {
  /* El endpoint de trofeos no usa los mismos nombres que el de competencias del mismo proveedor. */
  it('traduce los nombres que el proveedor escribe distinto', () => {
    expect(torneoDeTrofeo('CONMEBOL Copa America')).toBe('Copa América');
    expect(torneoDeTrofeo('UEFA European Championship')).toBe('Eurocopa');
    expect(torneoDeTrofeo('FIFA World Cup')).toBe('Mundial');
    expect(torneoDeTrofeo('UEFA Nations League')).toBe('Nations League');
  });

  it('no toca lo que ya coincide', () => {
    expect(torneoDeTrofeo('La Liga')).toBe('La Liga');
    expect(torneoDeTrofeo('Copa del Rey')).toBe('Copa del Rey');
  });

  /*
   * El Mundial de Clubes no es el Mundial. Ponerle el escudo equivocado a una Copa del Mundo es
   * peor que dejarla sin escudo, y por eso la tabla es escrita y no un parecido de texto.
   */
  it('no confunde el Mundial con el Mundial de Clubes', () => {
    expect(torneoDeTrofeo('FIFA Club World Cup')).toBe('FIFA Club World Cup');
  });

  it('traduce la Finalissima, que Athena sí tiene', () => {
    expect(torneoDeTrofeo('CONMEBOL/UEFA Finalissima')).toBe('Finalissima');
  });

  /*
   * La Copa Intercontinental de clubes no es el repechaje de eliminatorias, por mucho que las dos
   * digan "intercontinental". Sin alias se queda sin escudo, que es lo correcto.
   */
  it('no confunde la Copa Intercontinental con el repechaje', () => {
    expect(torneoDeTrofeo('FIFA Intercontinental Cup')).toBe('FIFA Intercontinental Cup');
  });

  it('lo que no está en la tabla se queda como vino', () => {
    expect(torneoDeTrofeo('Community Shield')).toBe('Community Shield');
    expect(torneoDeTrofeo('Trofeo Joan Gamper')).toBe('Trofeo Joan Gamper');
  });
});
