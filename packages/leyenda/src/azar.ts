/**
 * El azar del juego, con semilla.
 *
 * Toda la aleatoriedad de una carrera pasa por acá y por ninguna otra parte. Eso compra tres cosas
 * que no se consiguen con `Math.random()`: la misma semilla reproduce la misma carrera —así una
 * partida se puede compartir por URL y un test puede afirmar sobre el resultado—, el estado se
 * guarda y se retoma sin que el hilo del azar se corte, y un bug se puede reproducir con solo el
 * número de la semilla.
 *
 * El generador es mulberry32: 32 bits de estado, distribución suficientemente buena para un juego,
 * y cabe en un entero que viaja dentro del `localStorage` sin ceremonia.
 */
export interface Azar {
  /** Flotante en [0, 1). */
  siguiente(): number;
  /** El estado actual, para guardar la partida sin perder el hilo. */
  estado(): number;
}

export function crearAzar(semilla: number): Azar {
  let s = semilla >>> 0;
  return {
    siguiente() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    estado() {
      return s;
    },
  };
}

/** Una semilla a partir de un texto: el mismo nombre da la misma carrera del día. */
export function semillaDe(texto: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Entero en [min, max], ambos incluidos. */
export function entre(azar: Azar, min: number, max: number): number {
  return min + Math.floor(azar.siguiente() * (max - min + 1));
}

/** Flotante en [min, max). */
export function entreFlotante(azar: Azar, min: number, max: number): number {
  return min + azar.siguiente() * (max - min);
}

export function chance(azar: Azar, probabilidad: number): boolean {
  return azar.siguiente() < probabilidad;
}

export function elegir<T>(azar: Azar, opciones: readonly T[]): T {
  if (opciones.length === 0) throw new Error('elegir() sobre una lista vacía');
  return opciones[Math.floor(azar.siguiente() * opciones.length)] as T;
}

/**
 * Elección por peso. Un peso de 0 o negativo nunca sale, que es lo que permite escribir el catálogo
 * de eventos con pesos calculados sin filtrar antes.
 */
export function pesado<T>(azar: Azar, opciones: ReadonlyArray<{ item: T; peso: number }>): T | null {
  const validas = opciones.filter((o) => o.peso > 0);
  if (validas.length === 0) return null;
  const total = validas.reduce((suma, o) => suma + o.peso, 0);
  let corte = azar.siguiente() * total;
  for (const opcion of validas) {
    corte -= opcion.peso;
    if (corte <= 0) return opcion.item;
  }
  return validas[validas.length - 1]?.item ?? null;
}

/** Mezcla sin tocar el original (Fisher-Yates). */
export function mezclar<T>(azar: Azar, lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar.siguiente() * (i + 1));
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return copia;
}

/**
 * Campana centrada en `centro`. Suma tres tiradas: el promedio tiende al centro y los extremos son
 * raros, que es como se comporta el rendimiento de un futbolista —casi siempre cerca de su nivel,
 * de vez en cuando una tarde inolvidable o un partido para olvidar—.
 */
export function campana(azar: Azar, centro: number, amplitud: number): number {
  const tiradas = (azar.siguiente() + azar.siguiente() + azar.siguiente()) / 3;
  return centro + (tiradas - 0.5) * 2 * amplitud;
}

export const limitar = (valor: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, valor));
