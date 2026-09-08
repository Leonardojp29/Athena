/**
 * Las pruebas de los momentos jugables.
 *
 * La primera es la que importa: el desenlace y el éxito no pueden discrepar nunca. Ese era el bug que
 * hacía que la pantalla dijera "¡La atajó!" mientras la crónica contaba el gol, y no se puede volver a
 * colar porque acá se recorren las dieciocho combinaciones de zona y remate de los cuatro momentos.
 */
import { describe, expect, it } from 'vitest';
import { crearAzar } from './azar.js';
import { REMATES, ZONAS, resolverMomento, type Remate, type Zona } from './momentos.js';
import type { Atributos, ClaseDeMomento, ContextoDeMomento } from './estado.js';

const ATRIBUTOS: Atributos = { ritmo: 75, tiro: 75, pase: 70, regate: 70, defensa: 70, fisico: 72 };

const CONTEXTO: ContextoDeMomento = {
  escena: 'Final de la Copa',
  rival: 'el clásico rival',
  minuto: 89,
  marcador: [1, 1],
  presion: 0.7,
  competencia: 'Copa',
  enJuego: null,
};

const CLASES: ClaseDeMomento[] = ['penal', 'mano-a-mano', 'tiro-libre', 'atajada'];
const ZONAS_TODAS = Object.keys(ZONAS) as Zona[];

/** El arquero es el único que ataja para ganar: en el resto de los momentos ganar es meterla. */
const exitoEsperado = (clase: ClaseDeMomento, desenlace: string): boolean =>
  clase === 'atajada' ? desenlace === 'atajada' : desenlace === 'gol';

function medir(clase: ClaseDeMomento, zonas: Zona[], remates: Remate[] = REMATES) {
  let jugadas = 0;
  let exitos = 0;
  for (let semilla = 0; semilla < 1500; semilla++) {
    const azar = crearAzar(semilla * 7919 + 13);
    for (const zona of zonas) {
      for (const remate of remates) {
        const r = resolverMomento(azar, clase, { zona, remate }, ATRIBUTOS, CONTEXTO, 55);
        jugadas++;
        if (r.exito) exitos++;
      }
    }
  }
  return exitos / jugadas;
}

describe('los momentos jugables', () => {
  it('el desenlace y el éxito cuentan siempre lo mismo', () => {
    for (const clase of CLASES) {
      for (let semilla = 0; semilla < 400; semilla++) {
        const azar = crearAzar(semilla * 104729 + 7);
        for (const zona of ZONAS_TODAS) {
          for (const remate of REMATES) {
            const r = resolverMomento(azar, clase, { zona, remate }, ATRIBUTOS, CONTEXTO, 55);
            expect(r.exito, `${clase} / ${zona} / ${remate} → ${r.desenlace}`).toBe(
              exitoEsperado(clase, r.desenlace),
            );
          }
        }
      }
    }
  });

  it('un arquero solo puede atajar o comerse el gol', () => {
    const azar = crearAzar(99);
    for (const zona of ZONAS_TODAS) {
      for (const remate of REMATES) {
        const r = resolverMomento(azar, 'atajada', { zona, remate }, ATRIBUTOS, CONTEXTO, 55);
        expect(['atajada', 'gol']).toContain(r.desenlace);
      }
    }
  });

  it('solo el tiro libre puede terminar en la barrera', () => {
    const azar = crearAzar(4242);
    for (const clase of CLASES) {
      for (const zona of ZONAS_TODAS) {
        for (const remate of REMATES) {
          const r = resolverMomento(azar, clase, { zona, remate }, ATRIBUTOS, CONTEXTO, 55);
          if (r.desenlace === 'barrera') expect(clase).toBe('tiro-libre');
        }
      }
    }
  });

  it('meter un gol siempre lo suma a la temporada', () => {
    const azar = crearAzar(31337);
    for (const clase of ['penal', 'mano-a-mano', 'tiro-libre'] as ClaseDeMomento[]) {
      for (const zona of ZONAS_TODAS) {
        for (const remate of REMATES) {
          const r = resolverMomento(azar, clase, { zona, remate }, ATRIBUTOS, CONTEXTO, 55);
          if (r.exito) expect(r.suma?.goles).toBe(1);
        }
      }
    }
  });

  /*
   * Convertir tiene que ser probable —el jugador lo pidió— pero con el orden del fútbol: un penal
   * entra más que un mano a mano y un mano a mano más que un tiro libre. Antes estaba al revés.
   */
  it('la conversión es generosa y en el orden correcto', () => {
    const penal = medir('penal', ZONAS_TODAS);
    const manoAMano = medir('mano-a-mano', ZONAS_TODAS);
    /* Raso y al medio está la barrera: la pantalla no ofrece esa zona en un tiro libre. */
    const tiroLibre = medir(
      'tiro-libre',
      ZONAS_TODAS.filter((z) => z !== 'centro-baja'),
    );

    expect(penal).toBeGreaterThan(0.74);
    expect(penal).toBeLessThan(0.86);
    expect(manoAMano).toBeGreaterThan(0.48);
    expect(tiroLibre).toBeGreaterThan(0.33);
    expect(penal).toBeGreaterThan(manoAMano);
    expect(manoAMano).toBeGreaterThan(tiroLibre);
  });

  it('el arquero ataja cerca de la mitad de lo que le patean', () => {
    const atajada = medir('atajada', ZONAS_TODAS);
    expect(atajada).toBeGreaterThan(0.34);
    expect(atajada).toBeLessThan(0.58);
  });

  /* Picarla es el lujo: paga en reputación, no en probabilidad. Si fuera la mejor siempre, no habría decisión. */
  it('picarla no es la opción óptima', () => {
    const colocada = medir('penal', ZONAS_TODAS, ['colocada']);
    const picada = medir('penal', ZONAS_TODAS, ['picarla']);
    expect(picada).toBeLessThan(colocada);
  });

  it('esquinar arriba contra un arquero que se equivoca es casi gol seguro', () => {
    const esquinado = medir('penal', ['izq-alta', 'der-alta'], ['colocada']);
    const alMedio = medir('penal', ['centro-baja'], ['colocada']);
    expect(esquinado).toBeGreaterThan(alMedio);
    expect(esquinado).toBeGreaterThan(0.82);
  });

  it('la misma semilla y la misma intención dan la misma jugada', () => {
    const uno = resolverMomento(crearAzar(777), 'penal', { zona: 'der-alta', remate: 'colocada' }, ATRIBUTOS, CONTEXTO, 55);
    const dos = resolverMomento(crearAzar(777), 'penal', { zona: 'der-alta', remate: 'colocada' }, ATRIBUTOS, CONTEXTO, 55);
    expect(dos).toEqual(uno);
  });
});
