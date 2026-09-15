import { describe, expect, it } from 'vitest';
import {
  DURACION_MS,
  catalogoDelSorteo,
  empezar,
  intentar,
  pedirPista,
  rendirse,
  restante,
  resumen,
  terminada,
  tictac,
  type Partida,
  type Reto,
} from './motor.js';

const RETO: Reto = {
  clave: 'int-dificil-12',
  formacion: '4-2-3-1',
  casilleros: Array.from({ length: 11 }, (_, i) => ({
    playerId: `j${i}`,
    grid: `${Math.floor(i / 4) + 1}:${(i % 4) + 1}`,
    puesto: null,
  })),
};

const ARRANQUE = 1_000_000;
const armar = (conTiempo = true): Partida =>
  empezar(RETO, { conTiempo, dificultad: 'normal', arrancaEn: ARRANQUE });

const elegir = (id: string) => ({ id, nombre: id.toUpperCase(), fotoUrl: null });

describe('intentar', () => {
  it('un titular se acomoda en su casilla', () => {
    const v = intentar(armar(), elegir('j3'));

    expect(v.tipo).toBe('acierto');
    expect(v.partida.aciertos).toHaveLength(1);
    expect(v.partida.aciertos[0]?.grid).toBe('1:4');
  });

  /* Que no esté en el once es todo lo que el jugador se entera: decirle "fue suplente" sería contarle el partido. */
  it('quien no jugó suma un fallo y nada más', () => {
    const v = intentar(armar(), elegir('nadie'));

    expect(v.tipo).toBe('fallo');
    expect(v.partida.fallos).toBe(1);
    expect(v.partida.aciertos).toHaveLength(0);
  });

  it('el que ya se acertó avisa en vez de contar de nuevo', () => {
    const conUno = intentar(armar(), elegir('j0')).partida;
    const v = intentar(conUno, elegir('j0'));

    expect(v.tipo).toBe('repetido');
    expect(v.partida.aciertos).toHaveLength(1);
    expect(v.partida.fallos).toBe(0);
  });

  it('los once terminan la partida', () => {
    let partida = armar();
    for (let i = 0; i < 11; i++) partida = intentar(partida, elegir(`j${i}`)).partida;

    expect(terminada(partida)).toBe(true);
    expect(partida.desenlace).toBe('completo');
    expect(resumen(partida, ARRANQUE).aciertos).toBe(11);
  });

  it('una partida cerrada no acepta más intentos', () => {
    const rendida = rendirse(armar(), ARRANQUE + 1000);

    expect(intentar(rendida, elegir('j0')).tipo).toBe('cerrada');
  });
});

describe('pedirPista', () => {
  it('revela la primera letra de un casillero vacío, una sola vez', () => {
    const conPista = pedirPista(armar(), '1:1', 'O');
    const otraVez = pedirPista(conPista, '1:1', 'X');

    expect(otraVez.pistas['1:1']).toBe('O');
    expect(resumen(otraVez, ARRANQUE).pistas).toBe(1);
  });

  it('no gasta una pista en un casillero ya resuelto', () => {
    const conUno = intentar(armar(), elegir('j0')).partida;

    expect(pedirPista(conUno, '1:1', 'O').pistas).toEqual({});
  });
});

describe('el reloj', () => {
  it('cierra la partida cuando se acaba y no antes', () => {
    const partida = armar();
    const casi = tictac(partida, ARRANQUE + DURACION_MS.normal - 1);
    const justo = tictac(partida, ARRANQUE + DURACION_MS.normal);

    expect(terminada(casi)).toBe(false);
    expect(justo.desenlace).toBe('sin-tiempo');
  });

  it('sin tiempo no hay cuenta regresiva ni final por reloj', () => {
    const partida = armar(false);

    expect(restante(partida, ARRANQUE + 10 * 60_000)).toBeNull();
    expect(terminada(tictac(partida, ARRANQUE + 10 * 60_000))).toBe(false);
  });

  /* El reloj se detiene con la partida: si no, el resumen seguiría descontando mientras se lee. */
  it('lo que queda se congela al terminar', () => {
    let partida = armar();
    for (let i = 0; i < 11; i++) partida = intentar(partida, elegir(`j${i}`)).partida;
    const alTerminar = restante(partida, Date.now());

    expect(restante(partida, Date.now() + 60_000)).toBe(alTerminar);
  });
});

/*
 * El internacional tiene el doble de retos que el peruano: repartir por cantidad haría que lo
 * peruano casi no apareciera en un producto peruano.
 */
describe('catalogoDelSorteo', () => {
  it('en mixto la moneda es pareja', () => {
    expect(catalogoDelSorteo('mixto', 0.2)).toBe('internacional');
    expect(catalogoDelSorteo('mixto', 0.8)).toBe('peruano');
  });

  it('elegido un catálogo, no se cambia', () => {
    expect(catalogoDelSorteo('peruano', 0.1)).toBe('peruano');
    expect(catalogoDelSorteo('internacional', 0.9)).toBe('internacional');
  });
});
