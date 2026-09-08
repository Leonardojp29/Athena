/**
 * Las pruebas del vuelo de la pelota.
 *
 * Existen por dos bugs concretos. El primero: la escena resolvía la jugada por su cuenta y podía
 * cantar "¡La atajó!" mientras la crónica contaba el gol. Ahora el desenlace llega decidido y la
 * trayectoria se construye para él, así que lo que hay que demostrar es que **la pelota termina donde
 * el veredicto dice**: un gol dentro del arco, un remate afuera por afuera, un palo en el fierro.
 *
 * El segundo: el vuelo no terminaba nunca. Un remate al palo rebotaba hacia atrás y ninguna condición
 * volvía a cumplirse, así que la escena se congelaba con la pelota rodando —el 7% de los tiros—. Acá
 * se recorre cada combinación de zona, remate y distancia comprobando que todas cruzan el plano del
 * arco en un número acotado de pasos.
 */
import { describe, expect, it } from 'vitest';
import { REMATES, ZONAS, type Remate, type Desenlace as DesenlaceDeJugada, type Zona } from '@athena/leyenda';
import {
  ARCO,
  PENAL_DESDE,
  TIRO_LIBRE_DESDE,
  apuntarA,
  combaDe,
  copiar,
  integrar,
  objetivoDe,
  vueloDe,
  type Pelota,
} from './fisica';

const ZONAS_TODAS = Object.keys(ZONAS) as Zona[];
const DISTANCIAS = [8, PENAL_DESDE, TIRO_LIBRE_DESDE];
const DESENLACES: DesenlaceDeJugada[] = ['gol', 'atajada', 'palo', 'afuera', 'barrera'];
const PASO = 1 / 120;
/** El mismo tope que usa la escena: cinco segundos simulados. */
const PASOS_MAXIMOS = 600;

/** El vuelo hasta el plano del arco, contando los pasos que tardó. */
function volar(pelota: Pelota): { x: number; z: number; pasos: number } | null {
  const p = copiar(pelota);
  for (let paso = 1; paso <= PASOS_MAXIMOS; paso++) {
    integrar(p, PASO);
    if (p.y <= 0) return { x: p.x, z: p.z, pasos: paso };
  }
  return null;
}

const disparar = (zona: Zona, remate: Remate, desenlace: DesenlaceDeJugada, desde: number) =>
  apuntarA(desde, objetivoDe(zona, desenlace), vueloDe(remate, desde), combaDe(remate, zona));

describe('el vuelo de la pelota', () => {
  it('todo remate llega al plano del arco sin quedarse en el aire', () => {
    for (const desde of DISTANCIAS) {
      for (const zona of ZONAS_TODAS) {
        for (const remate of REMATES) {
          for (const desenlace of DESENLACES) {
            const vuelo = volar(disparar(zona, remate, desenlace, desde));
            expect(vuelo, `${desde}m / ${zona} / ${remate} / ${desenlace} no cruzó nunca`).not.toBeNull();
            expect(vuelo!.pasos).toBeLessThan(PASOS_MAXIMOS);
          }
        }
      }
    }
  });

  /* Diez centímetros de error son la diferencia entre un gol y el palo, y por eso `apuntarA` corrige. */
  it('la pelota cae donde el desenlace manda, con diez centímetros de margen', () => {
    for (const desde of DISTANCIAS) {
      for (const zona of ZONAS_TODAS) {
        for (const remate of REMATES) {
          for (const desenlace of DESENLACES) {
            if (desenlace === 'barrera' || desenlace === 'atajada') continue;
            const objetivo = objetivoDe(zona, desenlace);
            const vuelo = volar(disparar(zona, remate, desenlace, desde))!;
            const error = Math.hypot(vuelo.x - objetivo.x, vuelo.z - objetivo.z);
            expect(error, `${desde}m / ${zona} / ${remate} / ${desenlace}`).toBeLessThan(0.1);
          }
        }
      }
    }
  });

  it('un gol entra por dentro de los palos y por debajo del travesaño', () => {
    for (const desde of DISTANCIAS) {
      for (const zona of ZONAS_TODAS) {
        for (const remate of REMATES) {
          const vuelo = volar(disparar(zona, remate, 'gol', desde))!;
          expect(Math.abs(vuelo.x), `${zona} / ${remate}`).toBeLessThan(ARCO.ancho / 2 - 0.11);
          expect(vuelo.z).toBeLessThan(ARCO.alto - 0.11);
          expect(vuelo.z).toBeGreaterThan(0);
        }
      }
    }
  });

  it('un remate afuera se va por afuera de verdad', () => {
    for (const desde of DISTANCIAS) {
      for (const zona of ZONAS_TODAS) {
        for (const remate of REMATES) {
          const vuelo = volar(disparar(zona, remate, 'afuera', desde))!;
          const dentro = Math.abs(vuelo.x) < ARCO.ancho / 2 && vuelo.z < ARCO.alto;
          expect(dentro, `${zona} / ${remate} entró siendo 'afuera'`).toBe(false);
        }
      }
    }
  });

  it('un palo pega en el fierro', () => {
    for (const zona of ZONAS_TODAS) {
      for (const remate of REMATES) {
        const vuelo = volar(disparar(zona, remate, 'palo', PENAL_DESDE))!;
        const enVertical = Math.abs(Math.abs(vuelo.x) - ARCO.ancho / 2) < 0.15;
        const enTravesano = Math.abs(vuelo.z - ARCO.alto) < 0.15;
        expect(enVertical || enTravesano, `${zona} / ${remate}`).toBe(true);
      }
    }
  });

  /* Una picada tiene que flotar y una potente no verse venir: si tardan lo mismo, la elección no se siente. */
  it('cada remate tiene su propio tiempo de vuelo', () => {
    const potente = vueloDe('potente', PENAL_DESDE);
    const colocada = vueloDe('colocada', PENAL_DESDE);
    const picada = vueloDe('picarla', PENAL_DESDE);
    expect(potente).toBeLessThan(colocada);
    expect(colocada).toBeLessThan(picada);
  });

  it('la comba curva hacia el palo que se busca', () => {
    expect(combaDe('colocada', 'der-alta')).toBeLessThan(0);
    expect(combaDe('colocada', 'izq-alta')).toBeGreaterThan(0);
    expect(combaDe('colocada', 'centro-alta')).toBeCloseTo(0);
  });

  it('el mismo tiro se repite igual', () => {
    const uno = disparar('der-alta', 'colocada', 'gol', PENAL_DESDE);
    const dos = disparar('der-alta', 'colocada', 'gol', PENAL_DESDE);
    expect(dos).toEqual(uno);
  });
});
