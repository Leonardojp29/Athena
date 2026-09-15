import { describe, expect, it } from 'vitest';
import {
  BONUS_RAPIDA,
  DURACION_MS,
  PUNTOS,
  VENTANA_RAPIDA_MS,
  empezar,
  multiplicadorDe,
  preguntaActual,
  responder,
  restante,
  resumen,
  siguiente,
  tictac,
  type Pregunta,
} from './motor.js';

const T0 = 1_700_000_000_000;

function pregunta(clave: string, dificultad: 'facil' | 'normal' | 'dificil' = 'normal'): Pregunta {
  return {
    clave,
    tipo: 'campeon',
    dificultad,
    enunciado: `¿Quién ganó ${clave}?`,
    explicacion: 'Porque sí.',
    emblemas: [],
    fotoRef: null,
    opciones: [
      { texto: 'buena', esCorrecta: true },
      { texto: 'mala', esCorrecta: false },
    ],
  };
}

/** Acierta la pregunta en pantalla y pasa a la siguiente, gastando `tarda` en cada una. */
function encadenar(inicial: ReturnType<typeof empezar>, cuantas: number, tarda = 3_000) {
  let partida = inicial;
  let reloj = T0;
  for (let i = 0; i < cuantas; i += 1) {
    reloj += tarda;
    partida = responder(partida, 'buena', reloj);
    partida = siguiente(partida, reloj);
  }
  return { partida, reloj };
}

const mazo = (n: number) => Array.from({ length: n }, (_, i) => pregunta(`Q${i}`));

describe('el motor de 60 Segundos', () => {
  it('el multiplicador sube por escalones', () => {
    expect([0, 2, 3, 5, 6, 9, 10, 25].map(multiplicadorDe)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  /*
   * La regla que más fácil se implementa al revés: con racha 5 la pantalla dice x2, así que ese
   * acierto tiene que puntuar x2 aunque deje la racha en 6.
   */
  it('cobra el multiplicador que el jugador estaba viendo, no el que resulta', () => {
    const { partida: conCinco } = encadenar(empezar(mazo(20), T0), 5);
    expect(conCinco.racha).toBe(5);

    const antes = conCinco.puntos;
    const sexto = responder(conCinco, 'buena', T0 + 30_000);

    expect(sexto.racha).toBe(6);
    expect(sexto.puntos - antes).toBe(PUNTOS.normal * 2);
    expect(sexto.mayorMultiplicador).toBe(3);
  });

  it('el bonus de rapidez es plano y solo dentro de la ventana', () => {
    const rapida = responder(empezar(mazo(3), T0), 'buena', T0 + VENTANA_RAPIDA_MS - 1);
    expect(rapida.puntos).toBe(PUNTOS.normal + BONUS_RAPIDA);
    expect(rapida.rapidas).toBe(1);

    const lenta = responder(empezar(mazo(3), T0), 'buena', T0 + VENTANA_RAPIDA_MS);
    expect(lenta.puntos).toBe(PUNTOS.normal);
    expect(lenta.rapidas).toBe(0);
  });

  it('el bonus no se multiplica: es un extra, no una apuesta', () => {
    const { partida, reloj } = encadenar(empezar(mazo(20), T0), 3);
    const antes = partida.puntos;
    const conBonus = responder(partida, 'buena', reloj + 500);

    expect(conBonus.puntos - antes).toBe(PUNTOS.normal * 2 + BONUS_RAPIDA);
  });

  it('fallar rompe la racha pero no termina la partida', () => {
    const { partida, reloj } = encadenar(empezar(mazo(20), T0), 4);
    expect(partida.racha).toBe(4);

    const fallada = responder(partida, 'mala', reloj + 1_000);

    expect(fallada.terminada).toBe(false);
    expect(fallada.racha).toBe(0);
    expect(fallada.fallos).toBe(1);
    expect(fallada.mejorRacha).toBe(4);
    expect(fallada.fallados).toHaveLength(1);
    expect(siguiente(fallada, reloj + 1_500).elegida).toBeNull();
  });

  it('el reloj cierra la partida al minuto y no antes', () => {
    const empezada = empezar(mazo(20), T0);

    expect(tictac(empezada, T0 + DURACION_MS - 1).terminada).toBe(false);

    const vencida = tictac(empezada, T0 + DURACION_MS);
    expect(vencida.terminada).toBe(true);
    expect(restante(vencida, T0 + DURACION_MS)).toBe(0);
  });

  it('contestar con el tiempo cumplido no puntúa', () => {
    const tarde = responder(empezar(mazo(20), T0), 'buena', T0 + DURACION_MS + 5);

    expect(tarde.terminada).toBe(true);
    expect(tarde.puntos).toBe(0);
    expect(tarde.aciertos).toBe(0);
  });

  it('una pregunta contestada no se vuelve a contestar', () => {
    const acertada = responder(empezar(mazo(20), T0), 'buena', T0 + 1_000);
    expect(responder(acertada, 'mala', T0 + 1_200)).toBe(acertada);
  });

  /* El reloj es uno solo: pasar de pregunta no lo toca. */
  it('encadenar no reinicia el reloj', () => {
    const { partida, reloj } = encadenar(empezar(mazo(20), T0), 3, 5_000);

    expect(partida.arrancaEn).toBe(T0);
    expect(restante(partida, reloj)).toBe(DURACION_MS - 15_000);
  });

  it('agotado el mazo vuelve a empezar en vez de dejar sin juego', () => {
    const { partida } = encadenar(empezar(mazo(2), T0), 2);

    expect(partida.indice).toBe(0);
    expect(preguntaActual(partida)?.clave).toBe('Q0');
    expect(partida.terminada).toBe(false);
  });

  it('el resumen cuenta la que quedó a medias y calcula la precisión', () => {
    const { partida, reloj } = encadenar(empezar(mazo(20), T0), 3);
    const fallada = responder(partida, 'mala', reloj + 1_000);
    const enPantalla = tictac(siguiente(fallada, reloj + 1_500), T0 + DURACION_MS);

    const cuenta = resumen(enPantalla);
    expect(cuenta.aciertos).toBe(3);
    expect(cuenta.fallos).toBe(1);
    expect(cuenta.vistas).toBe(5);
    expect(cuenta.precision).toBe(75);
    expect(cuenta.mejorRacha).toBe(3);
  });

  it('un mazo vacío nace terminado en vez de romperse', () => {
    const vacia = empezar([], T0);

    expect(vacia.terminada).toBe(true);
    expect(preguntaActual(vacia)).toBeNull();
    expect(resumen(vacia)).toMatchObject({ vistas: 0, precision: 0 });
  });
});
