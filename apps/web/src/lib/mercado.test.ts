import { describe, expect, it } from 'vitest';
import { agruparPalmares, contarPalmares, detalleDeFichaje, nombreDeClase } from './mercado';
import type { Trofeo } from './api';

const titulo = (competencia: string, temporada: string | null, puesto: Trofeo['puesto'] = 'campeon'): Trofeo => ({
  competencia,
  pais: 'Peru',
  temporada,
  puesto,
  logoUrl: null,
  slug: null,
});

describe('nombreDeClase', () => {
  /* Cuatro de cada diez pases no traen clase: escribir "Desconocido" es publicar nuestra ignorancia. */
  it('calla cuando el proveedor no dijo qué fue', () => {
    expect(nombreDeClase('desconocido')).toBeNull();
  });

  it('nombra las cuatro que sí se saben', () => {
    expect(nombreDeClase('traspaso')).toBe('Traspaso');
    expect(nombreDeClase('prestamo')).toBe('A préstamo');
    expect(nombreDeClase('vuelve-de-prestamo')).toBe('Vuelve de préstamo');
    expect(nombreDeClase('libre')).toBe('Libre');
  });
});

describe('detalleDeFichaje', () => {
  it('junta la clase con el monto cuando hay los dos', () => {
    expect(detalleDeFichaje({ clase: 'traspaso', monto: '€ 1.5M' })).toBe('Traspaso · € 1.5M');
  });

  it('con monto pero sin clase, el monto solo', () => {
    expect(detalleDeFichaje({ clase: 'desconocido', monto: '€ 3M' })).toBe('€ 3M');
  });

  it('sin nada que decir, nada', () => {
    expect(detalleDeFichaje({ clase: 'desconocido', monto: null })).toBeNull();
  });
});

describe('agruparPalmares', () => {
  it('ordena del año más nuevo al más viejo', () => {
    const grupos = agruparPalmares([titulo('A', '2019'), titulo('B', '2024'), titulo('C', '2021')]);
    expect(grupos.map((g) => g.temporada)).toEqual(['2024', '2021', '2019']);
  });

  /* Son el 45% de las filas: colarlos entre los años fechados haría dudar de todos los demás. */
  it('manda los títulos sin año a un grupo propio, al final', () => {
    const grupos = agruparPalmares([titulo('Sin año', null), titulo('Con año', '2020')]);
    expect(grupos.map((g) => g.temporada)).toEqual(['2020', null]);
    expect(grupos[1]!.titulos).toHaveLength(1);
  });

  it('dentro de un año, lo ganado antes que lo perdido', () => {
    const grupos = agruparPalmares([
      titulo('Copa', '2020', 'subcampeon'),
      titulo('Liga', '2020', 'campeon'),
    ]);
    expect(grupos[0]!.titulos.map((t) => t.puesto)).toEqual(['campeon', 'subcampeon']);
  });

  it('sin títulos no arma grupos', () => {
    expect(agruparPalmares([])).toEqual([]);
  });
});

describe('contarPalmares', () => {
  it('cuenta ganados y perdidos por separado', () => {
    expect(
      contarPalmares([titulo('A', '2020'), titulo('B', '2021'), titulo('C', '2022', 'subcampeon')]),
    ).toEqual({ campeon: 2, subcampeon: 1 });
  });
});
