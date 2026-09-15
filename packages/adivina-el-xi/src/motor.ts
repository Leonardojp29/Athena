/**
 * Las reglas de Adivina el XI, sin DOM y sin reloj propio.
 *
 * El tiempo entra como parámetro en `tictac` en lugar de leerse acá: así un test comprueba que a
 * los cinco minutos la partida se cierra sin esperarlos, y la isla de React se queda con una sola
 * responsabilidad, que es pintar.
 */

export type Catalogo = 'internacional' | 'peruano' | 'mixto' | 'aleatorio';
export type Dificultad = 'facil' | 'normal' | 'dificil';
/** Lo que el jugador elige; `aleatorio` deja que el juego decida en cada partida. */
export type DificultadElegida = Dificultad | 'aleatorio';

/**
 * Lo que dura una partida contra reloj: tres minutos, sea cual sea la dificultad.
 *
 * Antes cada dificultad tenía el suyo y hacía que los tiempos no se pudieran comparar: terminar un
 * XI difícil en 4:10 no decía nada frente a uno fácil en 1:50. Con el mismo reloj para todas, lo
 * que cambia es el once y no la regla.
 */
export const DURACION_MS = 3 * 60_000;

export interface Casillero {
  /** El id del proveedor: la identidad del juego, la misma del índice del buscador. */
  ref: string;
  /** 'fila:columna' desde el arco propio. */
  grid: string;
  puesto: string | null;
}

export interface Reto {
  clave: string;
  formacion: string;
  casilleros: Casillero[];
}

export interface Opciones {
  conTiempo: boolean;
  dificultad: Dificultad;
  /** El instante en que arranca el reloj, que es cuando termina la cuenta regresiva. */
  arrancaEn: number;
}

/** Lo que el buscador devuelve y el jugador elige. La foto se deriva del ref y no viaja. */
export interface Eleccion {
  ref: string;
  nombre: string;
}

export interface Acierto extends Eleccion {
  grid: string;
}

export type Desenlace = 'completo' | 'sin-tiempo' | 'rendido';

export interface Partida {
  reto: Reto;
  opciones: Opciones;
  aciertos: Acierto[];
  /** La primera letra revelada, por casillero. */
  pistas: Record<string, string>;
  fallos: number;
  terminadaEn: number | null;
  desenlace: Desenlace | null;
}

export type Veredicto =
  | { tipo: 'acierto'; partida: Partida; grid: string }
  | { tipo: 'repetido'; partida: Partida }
  | { tipo: 'fallo'; partida: Partida }
  | { tipo: 'cerrada'; partida: Partida };

export function empezar(reto: Reto, opciones: Opciones): Partida {
  return {
    reto,
    opciones,
    aciertos: [],
    pistas: {},
    fallos: 0,
    terminadaEn: null,
    desenlace: null,
  };
}

export const terminada = (partida: Partida): boolean => partida.desenlace !== null;

/** Cuánto queda, en milisegundos. Null cuando se juega sin reloj. */
export function restante(partida: Partida, ahora: number): number | null {
  if (!partida.opciones.conTiempo) return null;
  const limite = partida.opciones.arrancaEn + DURACION_MS;
  return Math.max(0, limite - (partida.terminadaEn ?? ahora));
}

/**
 * Un intento.
 *
 * Fallar no descuenta tiempo ni dice nada del futbolista: que no esté en el once es todo lo que el
 * jugador se entera, porque decirle "fue suplente" ya sería contarle parte del partido.
 */
export function intentar(partida: Partida, eleccion: Eleccion): Veredicto {
  if (terminada(partida)) return { tipo: 'cerrada', partida };

  if (partida.aciertos.some((a) => a.ref === eleccion.ref)) {
    return { tipo: 'repetido', partida };
  }

  const casillero = partida.reto.casilleros.find((c) => c.ref === eleccion.ref);
  if (!casillero) {
    return { tipo: 'fallo', partida: { ...partida, fallos: partida.fallos + 1 } };
  }

  const aciertos = [...partida.aciertos, { ...eleccion, grid: casillero.grid }];
  const completa = aciertos.length === partida.reto.casilleros.length;
  return {
    tipo: 'acierto',
    grid: casillero.grid,
    partida: {
      ...partida,
      aciertos,
      ...(completa ? { desenlace: 'completo' as const, terminadaEn: Date.now() } : {}),
    },
  };
}

/**
 * Una pista: la primera letra del nombre de ese casillero.
 *
 * Nunca revela al futbolista entero ni se da sola cuando quedan pocos. Acordarse de los últimos
 * dos nombres es justamente la parte difícil, y regalarla sería quitarle el final al juego.
 */
export function pedirPista(partida: Partida, grid: string, primeraLetra: string): Partida {
  if (terminada(partida)) return partida;
  if (partida.aciertos.some((a) => a.grid === grid)) return partida;
  if (partida.pistas[grid]) return partida;
  return { ...partida, pistas: { ...partida.pistas, [grid]: primeraLetra } };
}

export function rendirse(partida: Partida, ahora: number): Partida {
  if (terminada(partida)) return partida;
  return { ...partida, desenlace: 'rendido', terminadaEn: ahora };
}

/** Cierra la partida si se acabó el reloj. Devuelve la misma cuando no hay nada que hacer. */
export function tictac(partida: Partida, ahora: number): Partida {
  if (terminada(partida) || !partida.opciones.conTiempo) return partida;
  if ((restante(partida, ahora) ?? 1) > 0) return partida;
  return { ...partida, desenlace: 'sin-tiempo', terminadaEn: ahora };
}

export interface Resumen {
  aciertos: number;
  total: number;
  fallos: number;
  pistas: number;
  desenlace: Desenlace | null;
  /** Lo que tardó, o null si no se jugó contra reloj. */
  tardoMs: number | null;
  restanteMs: number | null;
}

export function resumen(partida: Partida, ahora: number): Resumen {
  const fin = partida.terminadaEn ?? ahora;
  return {
    aciertos: partida.aciertos.length,
    total: partida.reto.casilleros.length,
    fallos: partida.fallos,
    pistas: Object.keys(partida.pistas).length,
    desenlace: partida.desenlace,
    tardoMs: partida.opciones.conTiempo ? fin - partida.opciones.arrancaEn : null,
    restanteMs: restante(partida, ahora),
  };
}

/**
 * Con qué catálogo sale el próximo reto.
 *
 * En Mixto la moneda es pareja y no proporcional a cuántos retos tiene cada lado: el catálogo
 * internacional tiene el doble, y repartir por cantidad haría que lo peruano casi no apareciera en
 * un producto peruano.
 */
export function catalogoDelSorteo(elegido: Catalogo, alAzar: number): 'internacional' | 'peruano' {
  if (elegido === 'internacional' || elegido === 'peruano') return elegido;
  return alAzar < 0.5 ? 'internacional' : 'peruano';
}

/** Las tres dificultades, en el orden en que se muestran. */
export const DIFICULTADES: readonly Dificultad[] = ['facil', 'normal', 'dificil'];

/** Con `aleatorio` la dificultad cambia en cada partida, que es la gracia de elegirlo. */
export function dificultadDelSorteo(elegida: DificultadElegida, alAzar: number): Dificultad {
  if (elegida !== 'aleatorio') return elegida;
  return DIFICULTADES[Math.min(Math.floor(alAzar * DIFICULTADES.length), 2)] as Dificultad;
}
