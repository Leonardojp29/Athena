import { describe, expect, it } from 'vitest';
import {
  minutoDeJugada,
  motivoDeTarjeta,
  relatoDelPartido,
  revisionDeVar,
  type EventoDeRelato,
  type PartidoDeRelato,
} from './relato.js';

const LOCAL = { id: 'uni' };
const VISITA = { id: 'spo' };

let siguiente = 0;
const evento = (
  kind: string,
  minute: number,
  equipo: { id: string },
  extra: Partial<EventoDeRelato> = {},
): EventoDeRelato => ({
  id: `e${siguiente++}`,
  kind,
  minute,
  extraMinute: null,
  team: equipo,
  ...extra,
});

const partido = (events: EventoDeRelato[], resultado: [number, number] | null, status = 'finished'): PartidoDeRelato => ({
  status,
  homeScore: resultado?.[0] ?? null,
  awayScore: resultado?.[1] ?? null,
  homeTeam: LOCAL,
  events,
});

const jugadas = (filas: ReturnType<typeof relatoDelPartido>) =>
  filas.filter((f) => f.clase === 'jugada');
const bandas = (filas: ReturnType<typeof relatoDelPartido>) =>
  filas.filter((f) => f.clase === 'banda');

describe('relatoDelPartido', () => {
  it('lleva el marcador corriente y pone el autogol del otro lado', () => {
    const filas = relatoDelPartido(
      partido(
        [
          evento('goal', 12, LOCAL),
          evento('own_goal', 41, LOCAL),
          evento('penalty_goal', 77, LOCAL),
        ],
        [2, 1],
      ),
    );
    /* El autogol lo firma el local y el gol es del visitante: 1-0, 1-1, 2-1. */
    expect(jugadas(filas).map((j) => j.marcador)).toEqual([
      { local: 1, visita: 0 },
      { local: 1, visita: 1 },
      { local: 2, visita: 1 },
    ]);
  });

  /*
   * La regla que sostiene todo: si la suma no reconstruye el resultado oficial, no se muestra ni un
   * marcador. El proveedor deja goles anulados en la lista y se saltea penales; un "2-1" al lado de
   * un gol es peor que ningún número.
   */
  it('no muestra marcadores cuando la suma no cuadra con el resultado oficial', () => {
    const filas = relatoDelPartido(
      partido([evento('goal', 12, LOCAL), evento('goal', 30, LOCAL)], [1, 0]),
    );
    expect(jugadas(filas).every((j) => j.marcador === null)).toBe(true);
  });

  it('en un partido en juego acepta ir por detrás del marcador, nunca por delante', () => {
    const enJuego = (goles: EventoDeRelato[], resultado: [number, number]) =>
      jugadas(relatoDelPartido(partido(goles, resultado, 'in_play'))).at(-1)?.marcador;

    /* El API ya cantó el 2-0 y la lista de eventos todavía trae uno: se muestra igual. */
    expect(enJuego([evento('goal', 12, LOCAL)], [2, 0])).toEqual({ local: 1, visita: 0 });
    /* Pero si la lista se pasa del marcador, algo está mal y no se afirma nada. */
    expect(enJuego([evento('goal', 12, LOCAL), evento('goal', 20, LOCAL)], [1, 0])).toBeNull();
  });

  it('separa los tramos y le pone el marcador al entretiempo', () => {
    const filas = relatoDelPartido(
      partido(
        [evento('goal', 12, LOCAL), evento('goal', 61, VISITA), evento('goal', 95, LOCAL)],
        [2, 1],
      ),
    );
    expect(bandas(filas).map((b) => `${b.titulo}:${b.marcador ? `${b.marcador.local}-${b.marcador.visita}` : '—'}`)).toEqual([
      'Entretiempo:1-0',
      'Alargue:1-1',
      'Final:2-1',
    ]);
  });

  it('no inventa un entretiempo cuando no hubo nada en el primer tiempo', () => {
    const filas = relatoDelPartido(partido([evento('goal', 61, LOCAL)], [1, 0]));
    expect(bandas(filas).map((b) => b.titulo)).toEqual(['Final']);
  });

  /* El minuto se escribe una vez por grupo: repetirlo en columna se lee como un error de render. */
  it('marca qué jugada abre cada minuto', () => {
    const filas = relatoDelPartido(
      partido([evento('goal', 77, LOCAL), evento('substitution', 77, LOCAL)], [1, 0]),
    );
    expect(jugadas(filas).map((j) => j.abreMinuto)).toEqual([true, false]);
  });

  /* El proveedor no distingue la doble amarilla, pero una roja a quien ya tenía amarilla lo es. */
  it('deduce la doble amarilla', () => {
    const jugador = { id: 'yotun' };
    const filas = relatoDelPartido(
      partido(
        [
          evento('yellow_card', 30, VISITA, { player: jugador }),
          evento('red_card', 58, VISITA, { player: jugador }),
          evento('red_card', 70, VISITA, { player: { id: 'otro' } }),
        ],
        [0, 0],
      ),
    );
    expect(jugadas(filas).map((j) => j.dobleAmarilla)).toEqual([false, true, false]);
  });

  it('ordena el minuto agregado después del minuto pelado', () => {
    const filas = relatoDelPartido(
      partido(
        [
          evento('goal', 45, LOCAL, { extraMinute: 3 }),
          evento('goal', 45, LOCAL),
        ],
        [2, 0],
      ),
    );
    expect(jugadas(filas).map((j) => minutoDeJugada(j.evento))).toEqual(['45', '45+3']);
  });

  it('los minutos negativos del proveedor quedan antes del arranque y sin número', () => {
    const filas = relatoDelPartido(
      partido([evento('yellow_card', -3, LOCAL), evento('goal', 20, LOCAL)], [1, 0]),
    );
    expect(bandas(filas)[0]?.titulo).toBe('Antes del arranque');
    expect(minutoDeJugada(jugadas(filas)[0]!.evento)).toBe('–');
  });
});

describe('lo que el proveedor cuenta, en español', () => {
  it('traduce lo que revisó el VAR y cae en la frase genérica con lo desconocido', () => {
    expect(revisionDeVar('Goal cancelled')).toBe('El VAR anuló el gol');
    expect(revisionDeVar('Penalty confirmed')).toBe('El VAR confirmó el penal');
    expect(revisionDeVar('Something new')).toBe('Revisión del VAR');
    expect(revisionDeVar(null)).toBe('Revisión del VAR');
  });

  it('traduce el motivo de una tarjeta y omite lo que no reconoce', () => {
    expect(motivoDeTarjeta('Foul')).toBe('por falta');
    expect(motivoDeTarjeta('Time wasting')).toBe('por demorar el juego');
    /* Antes que mostrar el inglés crudo, no se dice nada: el icono ya informa. */
    expect(motivoDeTarjeta('Excessive celebration')).toBeNull();
    expect(motivoDeTarjeta(null)).toBeNull();
  });
});
