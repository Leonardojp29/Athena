import { describe, expect, it } from 'vitest';
import {
  APREMIO_MS,
  DURACION_MS,
  apremia,
  clavesJugadas,
  elegir,
  empezar,
  impostorDe,
  necesitaMasRondas,
  resumen,
  restante,
  siguiente,
  tictac,
  type Ronda,
} from './motor.js';

const T0 = 1_700_000_000_000;

function ronda(clave: string, impostorRef = 'x'): Ronda {
  return {
    clave,
    dificultad: 'normal',
    categoria: 'clubes',
    enunciado: `¿Quién se coló en ${clave}?`,
    reveal: 'Llegó una temporada después.',
    opciones: ['a', 'b', 'c', 'd', 'e', impostorRef].map((ref) => ({
      ref,
      nombre: `Futbolista ${ref}`,
      esImpostor: ref === impostorRef,
    })),
  };
}

describe('el motor de El Impostor', () => {
  it('acertar suma racha y deja seguir', () => {
    const empezada = empezar([ronda('IMP-001'), ronda('IMP-002')], T0);
    const acertada = elegir(empezada, 'x', T0 + 1_500);

    expect(acertada.desenlace).toBe('acertada');
    expect(acertada.racha).toBe(1);
    expect(acertada.terminada).toBe(false);

    const segunda = siguiente(acertada, T0 + 3_000);
    expect(segunda.indice).toBe(1);
    expect(segunda.desenlace).toBeNull();
    expect(segunda.racha).toBe(1);
  });

  it('fallar termina la partida en el acto', () => {
    const fallada = elegir(empezar([ronda('IMP-001'), ronda('IMP-002')], T0), 'a', T0 + 900);

    expect(fallada.desenlace).toBe('fallada');
    expect(fallada.terminada).toBe(true);
    expect(fallada.racha).toBe(0);
    expect(siguiente(fallada, T0 + 5_000).indice).toBe(0);
  });

  it('el reloj cierra la ronda al cumplirse su duración y no antes', () => {
    const empezada = empezar([ronda('IMP-001')], T0);

    expect(tictac(empezada, T0 + DURACION_MS - 1).desenlace).toBeNull();

    const vencida = tictac(empezada, T0 + DURACION_MS);
    expect(vencida.desenlace).toBe('sin-tiempo');
    expect(vencida.terminada).toBe(true);
    expect(vencida.elegido).toBeNull();
    expect(restante(vencida, T0 + DURACION_MS)).toBe(0);
  });

  it('elegir con el tiempo cumplido no salva la ronda', () => {
    const tarde = elegir(empezar([ronda('IMP-001')], T0), 'x', T0 + DURACION_MS + 5);

    expect(tarde.desenlace).toBe('sin-tiempo');
    expect(tarde.racha).toBe(0);
  });

  it('una ronda resuelta no se vuelve a elegir', () => {
    const acertada = elegir(empezar([ronda('IMP-001')], T0), 'x', T0 + 1_000);
    const otraVez = elegir(acertada, 'a', T0 + 1_200);

    expect(otraVez).toBe(acertada);
  });

  it('el apremio empieza a falta de tres segundos', () => {
    const empezada = empezar([ronda('IMP-001')], T0);

    expect(apremia(empezada, T0 + DURACION_MS - APREMIO_MS - 1)).toBe(false);
    expect(apremia(empezada, T0 + DURACION_MS - APREMIO_MS)).toBe(true);
    expect(apremia(empezada, T0 + DURACION_MS)).toBe(false);
  });

  it('al acertar la última ronda pide otra tanda y la encadena', () => {
    const acertada = elegir(empezar([ronda('IMP-001')], T0), 'x', T0 + 800);
    expect(necesitaMasRondas(acertada)).toBe(true);

    const seguida = siguiente(acertada, T0 + 2_000, [ronda('IMP-002')]);
    expect(seguida.terminada).toBe(false);
    expect(seguida.indice).toBe(1);
    expect(clavesJugadas(seguida)).toEqual(['IMP-001', 'IMP-002']);
  });

  it('el resumen cuenta las rondas jugadas y de cuál fue el impostor', () => {
    const empezada = empezar([ronda('IMP-001'), ronda('IMP-002', 'z')], T0);
    const segunda = siguiente(elegir(empezada, 'x', T0 + 500), T0 + 2_000);
    const final = elegir(segunda, 'b', T0 + 2_500);

    const cuenta = resumen(final);
    expect(cuenta.racha).toBe(1);
    expect(cuenta.rondasJugadas).toBe(2);
    expect(cuenta.desenlace).toBe('fallada');
    expect(impostorDe(cuenta.ultimaRonda)?.ref).toBe('z');
  });

  it('una tanda vacía nace terminada en vez de romperse', () => {
    const vacia = empezar([], T0);

    expect(vacia.terminada).toBe(true);
    expect(impostorDe(null)).toBeNull();
    expect(resumen(vacia).rondasJugadas).toBe(0);
  });
});
