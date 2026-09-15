import { describe, expect, it } from 'vitest';
import {
  esDeLaTanda,
  goleadoresDelPartido,
  minutoDeJugada,
  motivoDeTarjeta,
  relatoDelPartido,
  revisionDeVar,
  tandaDePenales,
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
  /*
   * El autogol viene con el equipo al que le contó, no con el del jugador: sobre los 285 partidos
   * con autogol de la base, la suma cuadra con el marcador oficial 279 veces leyéndolo tal cual y 6
   * volteándolo. Acá el autogol lo sufre el visitante y suma para el local.
   */
  it('lleva el marcador corriente sumando el autogol al equipo al que le contó', () => {
    const filas = relatoDelPartido(
      partido(
        [
          evento('goal', 12, LOCAL),
          evento('own_goal', 41, LOCAL),
          evento('penalty_goal', 77, VISITA),
        ],
        [2, 1],
      ),
    );
    expect(jugadas(filas).map((j) => j.marcador)).toEqual([
      { local: 1, visita: 0 },
      { local: 2, visita: 0 },
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

describe('goleadoresDelPartido', () => {
  it('agrupa los goles de un mismo jugador en una línea', () => {
    const yotun = { id: 'yotun', name: 'Yoshimar Yotún' };
    const { visita } = goleadoresDelPartido({
      homeTeam: LOCAL,
      events: [
        evento('goal', 45, VISITA, { player: yotun, extraMinute: 2 }),
        evento('penalty_goal', 82, VISITA, { player: yotun }),
      ],
    });
    expect(visita).toHaveLength(1);
    expect(visita[0]!.nombre).toBe('Yoshimar Yotún');
    expect(visita[0]!.goles).toEqual([
      { minuto: 45, extra: 2, enContra: false, penal: false },
      { minuto: 82, extra: null, enContra: false, penal: true },
    ]);
  });

  /* El gol en contra se muestra en la columna del equipo que sumó, marcado y con quien se lo hizo. */
  it('cuenta el autogol del lado al que le contó y lo marca', () => {
    const { local, visita } = goleadoresDelPartido({
      homeTeam: LOCAL,
      events: [evento('own_goal', 30, LOCAL, { player: { id: 'almiron', name: 'Matías Almirón' } })],
    });
    expect(visita).toHaveLength(0);
    expect(local[0]?.nombre).toBe('Matías Almirón');
    expect(local[0]?.goles[0]?.enContra).toBe(true);
  });

  /*
   * Cuatro de cada diez goles llegan sin jugador resuelto, pero casi todos traen el nombre en el
   * detalle. Sin este respaldo la cabecera quedaría vacía en el 42% de los goles.
   */
  it('usa el nombre del detalle cuando el proveedor no resolvió al jugador', () => {
    const { local } = goleadoresDelPartido({
      homeTeam: LOCAL,
      events: [evento('goal', 12, LOCAL, { detail: { playerName: 'Facundo Callejo' } })],
    });
    expect(local[0]?.nombre).toBe('Facundo Callejo');
  });

  it('un partido sin goles no tiene goleadores de ningún lado', () => {
    const { local, visita } = goleadoresDelPartido({
      homeTeam: LOCAL,
      events: [evento('yellow_card', 30, LOCAL), evento('missed_penalty', 60, VISITA)],
    });
    expect([local.length, visita.length]).toEqual([0, 0]);
  });
});

/*
 * La tanda de penales. El proveedor la manda como eventos normales con minutos que siguen al
 * alargue, así que sin separarla el 3-3 de Peterborough contra Barnsley se leía 10-9 en la
 * cabecera, con doce goleadores y el marcador corriente apagado porque la suma no cuadraba.
 */
describe('tanda de penales', () => {
  const dePenal = (minuto: number, equipo: { id: string }, entro = true) =>
    evento(entro ? 'penalty_goal' : 'missed_penalty', minuto, equipo, {
      detail: { label: 'Penalty', comments: 'Penalty Shootout' },
    });

  /* Tres a tres en los noventa y siete a seis en la tanda, como terminó de verdad. */
  const gol = (minuto: number, equipo: { id: string }, quien: string) =>
    evento('goal', minuto, equipo, { player: { id: quien, name: quien } });

  const conTanda = () =>
    partido(
      [
        gol(19, LOCAL, 'Leonard'),
        gol(27, LOCAL, 'Ormerod'),
        gol(40, VISITA, 'Cleary'),
        gol(74, VISITA, 'Kelly'),
        gol(88, LOCAL, 'Conn-Clarke'),
        gol(91, VISITA, 'Connell'),
        dePenal(91, VISITA),
        dePenal(92, LOCAL),
        dePenal(93, VISITA),
        dePenal(94, LOCAL),
        dePenal(100, VISITA, false),
        dePenal(100, LOCAL),
      ],
      [3, 3],
    );

  it('cuenta solo los penales convertidos de cada lado', () => {
    expect(tandaDePenales(conTanda())).toEqual({ local: 3, visita: 2 });
  });

  it('no hay tanda en un partido normal', () => {
    expect(tandaDePenales(partido([evento('goal', 10, LOCAL)], [1, 0]))).toBeNull();
  });

  it('los penales de la tanda no suman al marcador ni son goleadores', () => {
    const match = conTanda();
    const { local, visita } = goleadoresDelPartido(match);
    expect(local.length + visita.length).toBe(6);
    expect([...local, ...visita].flatMap((g) => g.goles).length).toBe(6);
  });

  /* Si sumaran, la cuenta daría 6-5 contra un 3-3 oficial y el marcador corriente se apagaría. */
  it('el marcador corriente sigue cuadrando con el resultado oficial', () => {
    const ultimoGol = jugadas(relatoDelPartido(conTanda()))
      .filter((j) => j.marcador !== null)
      .at(-1);
    expect(ultimoGol?.marcador).toEqual({ local: 3, visita: 3 });
  });

  it('la tanda abre su propia banda y no cae en el alargue', () => {
    const titulos = bandas(relatoDelPartido(conTanda())).map((b) => b.titulo);
    expect(titulos).toContain('Penales');
    expect(titulos.filter((t) => t === 'Alargue').length).toBe(1);
  });

  it('un penal normal del partido no se confunde con uno de la tanda', () => {
    const normal = evento('penalty_goal', 55, LOCAL, {
      detail: { label: 'Penalty', comments: null },
    });
    expect(esDeLaTanda(normal)).toBe(false);
    expect(tandaDePenales(partido([normal], [1, 0]))).toBeNull();
  });
});
