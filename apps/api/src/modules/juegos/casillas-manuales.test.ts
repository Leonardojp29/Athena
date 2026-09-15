import { describe, expect, it } from 'vitest';
import { casillasManuales } from './casillas-manuales.js';

const REAL_MADRID_2018 = {
  formacion: '4-3-1-2',
  jugadores: ['navas', 'marcelo', 'ramos', 'varane', 'carvajal', 'kroos', 'casemiro', 'modric', 'isco', 'cristiano', 'benzema'],
};

describe('casillasManuales', () => {
  it('numera las filas desde el arquero y las columnas desde la izquierda', () => {
    const casillas = casillasManuales(REAL_MADRID_2018);

    expect(casillas?.get('navas')).toBe('1:1');
    expect(casillas?.get('marcelo')).toBe('2:1');
    expect(casillas?.get('carvajal')).toBe('2:4');
    expect(casillas?.get('kroos')).toBe('3:1');
    expect(casillas?.get('isco')).toBe('4:1');
    expect(casillas?.get('benzema')).toBe('5:2');
    expect(casillas?.size).toBe(11);
  });

  /* Una disposición a medias dibujaría una cancha equivocada, que es peor que no dibujarla. */
  it('no acomoda nada si la formación no suma once o la lista no los trae', () => {
    expect(casillasManuales({ ...REAL_MADRID_2018, jugadores: ['solo-uno'] })).toBeNull();
    expect(casillasManuales({ ...REAL_MADRID_2018, formacion: '4-3-2' })).toBeNull();
    expect(casillasManuales({ ...REAL_MADRID_2018, formacion: 'lo-que-sea' })).toBeNull();
  });

  it('la misma lista en otra formación cambia de casillas', () => {
    const casillas = casillasManuales({ ...REAL_MADRID_2018, formacion: '4-4-2' });

    expect(casillas?.get('isco')).toBe('3:4');
    expect(casillas?.get('cristiano')).toBe('4:1');
  });

  it('rechaza un futbolista repetido, que dejaría una casilla vacía', () => {
    const repetido = [...REAL_MADRID_2018.jugadores];
    repetido[10] = repetido[9] as string;
    expect(casillasManuales({ ...REAL_MADRID_2018, jugadores: repetido })).toBeNull();
  });
});
