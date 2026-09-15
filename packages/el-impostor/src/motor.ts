/**
 * Las reglas de El Impostor, sin DOM y sin reloj propio.
 *
 * El tiempo entra por parámetro, como en el motor de Adivina el XI: así un test comprueba que a los
 * diez segundos la ronda se cierra sin esperarlos, y la isla de React se queda con una sola
 * responsabilidad, que es pintar.
 */

/** Lo que dura una ronda. Es un juego de reflejos: diez segundos son la regla, no un parámetro. */
export const DURACION_MS = 10_000;
/** Cuando falta esto, el reloj apremia: cambia de color y late. */
export const APREMIO_MS = 3_000;

export interface Opcion {
  /** El id del proveedor: la identidad del juego y de donde sale la foto. */
  ref: string;
  nombre: string;
  esImpostor: boolean;
}

export interface Ronda {
  clave: string;
  dificultad: string;
  categoria: string;
  enunciado: string;
  /** Por qué el impostor no pertenecía. Se muestra al resolver, sin salir a la red. */
  reveal: string;
  opciones: Opcion[];
}

export type DesenlaceDeRonda = 'acertada' | 'fallada' | 'sin-tiempo';

export interface Partida {
  rondas: Ronda[];
  indice: number;
  /** El instante en que arrancó el reloj de la ronda actual. */
  arrancaEn: number;
  racha: number;
  acertadas: number;
  /** Lo que se eligió en la ronda actual; nulo si se acabó el tiempo. */
  elegido: string | null;
  desenlace: DesenlaceDeRonda | null;
  /** Una racha termina al primer fallo: no hay vidas ni segundas oportunidades. */
  terminada: boolean;
}

export interface Resumen {
  racha: number;
  rondasJugadas: number;
  desenlace: DesenlaceDeRonda | null;
  /** La ronda donde se cortó la racha, para poder contar qué pasó. */
  ultimaRonda: Ronda | null;
}

export function empezar(rondas: readonly Ronda[], arrancaEn: number): Partida {
  return {
    rondas: [...rondas],
    indice: 0,
    arrancaEn,
    racha: 0,
    acertadas: 0,
    elegido: null,
    desenlace: null,
    terminada: rondas.length === 0,
  };
}

export function rondaActual(partida: Partida): Ronda | null {
  return partida.rondas[partida.indice] ?? null;
}

export function restante(partida: Partida, ahora: number): number {
  if (partida.desenlace !== null) return 0;
  return Math.max(0, partida.arrancaEn + DURACION_MS - ahora);
}

export function apremia(partida: Partida, ahora: number): boolean {
  const queda = restante(partida, ahora);
  return queda > 0 && queda <= APREMIO_MS;
}

/**
 * Elegir una carta resuelve la ronda de inmediato.
 *
 * Una vez resuelta no se puede volver a elegir: la isla sigue pintando durante la animación de
 * revelado y un segundo clic no puede cambiar lo que ya pasó.
 */
export function elegir(partida: Partida, ref: string, ahora: number): Partida {
  if (partida.desenlace !== null || partida.terminada) return partida;
  if (restante(partida, ahora) === 0) return tictac(partida, ahora);

  const ronda = rondaActual(partida);
  const elegida = ronda?.opciones.find((o) => o.ref === ref);
  if (!ronda || !elegida) return partida;

  return elegida.esImpostor
    ? {
        ...partida,
        elegido: ref,
        desenlace: 'acertada',
        racha: partida.racha + 1,
        acertadas: partida.acertadas + 1,
      }
    : { ...partida, elegido: ref, desenlace: 'fallada', terminada: true };
}

/** Cierra la ronda cuando el reloj llega a cero. Idempotente: llamarlo de más no cambia nada. */
export function tictac(partida: Partida, ahora: number): Partida {
  if (partida.desenlace !== null || partida.terminada) return partida;
  if (ahora < partida.arrancaEn + DURACION_MS) return partida;
  return { ...partida, elegido: null, desenlace: 'sin-tiempo', terminada: true };
}

/** Verdadero cuando se acertó la última ronda de la tanda y hace falta pedir otra. */
export function necesitaMasRondas(partida: Partida): boolean {
  return partida.desenlace === 'acertada' && partida.indice >= partida.rondas.length - 1;
}

/**
 * Avanza a la siguiente ronda. Solo después de acertar: fallar o quedarse sin tiempo termina.
 *
 * `extra` son las rondas de una tanda nueva, que se agregan a las que quedaban.
 */
export function siguiente(
  partida: Partida,
  arrancaEn: number,
  extra: readonly Ronda[] = [],
): Partida {
  if (partida.desenlace !== 'acertada') return partida;

  const rondas = extra.length > 0 ? [...partida.rondas, ...extra] : partida.rondas;
  const indice = partida.indice + 1;
  if (indice >= rondas.length) return { ...partida, rondas, terminada: true };

  return { ...partida, rondas, indice, arrancaEn, elegido: null, desenlace: null };
}

export function impostorDe(ronda: Ronda | null): Opcion | null {
  return ronda?.opciones.find((o) => o.esImpostor) ?? null;
}

export function resumen(partida: Partida): Resumen {
  return {
    racha: partida.racha,
    rondasJugadas: partida.desenlace === null ? partida.indice : partida.indice + 1,
    desenlace: partida.desenlace,
    ultimaRonda: rondaActual(partida),
  };
}

/** Las claves ya vistas, para que la tanda siguiente no las repita. */
export function clavesJugadas(partida: Partida): string[] {
  return partida.rondas.map((r) => r.clave);
}
