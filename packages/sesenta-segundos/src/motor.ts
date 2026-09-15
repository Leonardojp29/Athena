/**
 * Las reglas de 60 Segundos, sin DOM y sin reloj propio.
 *
 * El tiempo entra por parámetro como en los otros dos motores: así un test comprueba que al minuto
 * la partida se cierra sin esperarlo, y la isla de React se queda con una sola responsabilidad, que
 * es pintar.
 */

/** Un minuto exacto, igual para todos. Acertar no suma tiempo y fallar no lo quita. */
export const DURACION_MS = 60_000;

export type Dificultad = 'facil' | 'normal' | 'dificil';

/** Lo que vale cada pregunta antes del multiplicador. */
export const PUNTOS: Record<Dificultad, number> = { facil: 100, normal: 200, dificil: 300 };

/** El premio por contestar de memoria. Va fuera del multiplicador: es un extra, no una apuesta. */
export const BONUS_RAPIDA = 50;
export const VENTANA_RAPIDA_MS = 2_000;

/* Los tres escalones del reloj. El color no es el único canal: el número siempre está al lado. */
export const TENSION_MS = 10_000;
export const URGENCIA_MS = 5_000;
export const PANICO_MS = 3_000;

export interface Opcion {
  texto: string;
  esCorrecta: boolean;
  /** La foto del futbolista, el escudo del club o la bandera. Nula en marcadores y verdadero/falso. */
  imagen: string | null;
}

export interface Pregunta {
  clave: string;
  tipo: string;
  dificultad: Dificultad;
  enunciado: string;
  /** Por qué esa es la respuesta. Nunca se muestra durante los sesenta segundos. */
  explicacion: string;
  /** Escudos, banderas o el logo del torneo: de acá sale que cada tipo se vea distinto. */
  emblemas: string[];
  /** El id del proveedor del futbolista retratado, en las preguntas de «¿quién es?». */
  fotoRef: string | null;
  opciones: Opcion[];
}

export interface Fallo {
  pregunta: Pregunta;
  elegida: string;
}

export interface Partida {
  preguntas: Pregunta[];
  indice: number;
  arrancaEn: number;
  /** Cuándo apareció la pregunta en pantalla, que es contra lo que se mide la rapidez. */
  mostradaEn: number;
  puntos: number;
  racha: number;
  mejorRacha: number;
  mayorMultiplicador: number;
  aciertos: number;
  fallos: number;
  rapidas: number;
  /** Lo elegido en la pregunta actual; nulo mientras no se conteste. */
  elegida: string | null;
  /** Cuánto sumó la última respuesta, para el `+200` que sube y se desvanece. */
  ultimoPuntaje: number;
  /** Si la última respuesta llegó dentro de la ventana de rapidez. */
  ultimaRapida: boolean;
  fallados: Fallo[];
  terminada: boolean;
}

export interface Resumen {
  puntos: number;
  vistas: number;
  aciertos: number;
  fallos: number;
  /** Entero de 0 a 100. Sin preguntas vistas es 0 y no una división por cero. */
  precision: number;
  mejorRacha: number;
  mayorMultiplicador: number;
  rapidas: number;
  fallados: Fallo[];
}

/** 0-2 aciertos seguidos x1 · 3-5 x2 · 6-9 x3 · 10 o más x4. */
export function multiplicadorDe(racha: number): number {
  if (racha >= 10) return 4;
  if (racha >= 6) return 3;
  if (racha >= 3) return 2;
  return 1;
}

export function empezar(preguntas: readonly Pregunta[], arrancaEn: number): Partida {
  return {
    preguntas: [...preguntas],
    indice: 0,
    arrancaEn,
    mostradaEn: arrancaEn,
    puntos: 0,
    racha: 0,
    mejorRacha: 0,
    mayorMultiplicador: 1,
    aciertos: 0,
    fallos: 0,
    rapidas: 0,
    elegida: null,
    ultimoPuntaje: 0,
    ultimaRapida: false,
    fallados: [],
    terminada: preguntas.length === 0,
  };
}

export function preguntaActual(partida: Partida): Pregunta | null {
  return partida.preguntas[partida.indice] ?? null;
}

export function restante(partida: Partida, ahora: number): number {
  return Math.max(0, partida.arrancaEn + DURACION_MS - ahora);
}

/** El multiplicador que el jugador está viendo, que es el que se le va a cobrar. */
export function multiplicadorActual(partida: Partida): number {
  return multiplicadorDe(partida.racha);
}

/**
 * Contestar.
 *
 * Fallar **no termina la partida**: cuesta la racha y el multiplicador, y se sigue. Es lo que
 * separa este juego de El Impostor, donde un error te mata.
 */
export function responder(partida: Partida, texto: string, ahora: number): Partida {
  if (partida.terminada || partida.elegida !== null) return partida;
  /* Contestar con el tiempo cumplido no puntúa: el reloj manda sobre la mano. */
  if (restante(partida, ahora) === 0) return tictac(partida, ahora);

  const pregunta = preguntaActual(partida);
  const elegida = pregunta?.opciones.find((o) => o.texto === texto);
  if (!pregunta || !elegida) return partida;

  if (!elegida.esCorrecta) {
    return {
      ...partida,
      elegida: texto,
      racha: 0,
      ultimoPuntaje: 0,
      ultimaRapida: false,
      fallos: partida.fallos + 1,
      fallados: [...partida.fallados, { pregunta, elegida: texto }],
    };
  }

  /*
   * El multiplicador que se cobra es el que estaba en pantalla, no el que resulta de este acierto.
   * Con racha 5 se ve `x2`: cobrar `x3` sería cobrarle al jugador algo que no vio.
   */
  const multiplicador = multiplicadorDe(partida.racha);
  const rapida = ahora - partida.mostradaEn < VENTANA_RAPIDA_MS;
  const sumado = PUNTOS[pregunta.dificultad] * multiplicador + (rapida ? BONUS_RAPIDA : 0);
  const racha = partida.racha + 1;

  return {
    ...partida,
    elegida: texto,
    puntos: partida.puntos + sumado,
    ultimoPuntaje: sumado,
    ultimaRapida: rapida,
    racha,
    mejorRacha: Math.max(partida.mejorRacha, racha),
    mayorMultiplicador: Math.max(partida.mayorMultiplicador, multiplicadorDe(racha)),
    aciertos: partida.aciertos + 1,
    rapidas: partida.rapidas + (rapida ? 1 : 0),
  };
}

/** Cierra la partida al cumplirse el minuto. Idempotente: llamarlo de más no cambia nada. */
export function tictac(partida: Partida, ahora: number): Partida {
  if (partida.terminada) return partida;
  if (ahora < partida.arrancaEn + DURACION_MS) return partida;
  return { ...partida, terminada: true };
}

/**
 * Pasa a la siguiente. Solo después de contestar, y nunca reinicia el reloj: es uno solo y global.
 *
 * Si se acabaron las preguntas vuelve a la primera. Con cincuenta en el catálogo hace falta una
 * partida muy rápida para llegar, pero quedarse sin juego a los cuarenta segundos sería peor.
 */
export function siguiente(partida: Partida, ahora: number): Partida {
  if (partida.terminada || partida.elegida === null) return partida;
  return {
    ...partida,
    indice: (partida.indice + 1) % partida.preguntas.length,
    mostradaEn: ahora,
    elegida: null,
    ultimoPuntaje: 0,
    ultimaRapida: false,
  };
}

export function resumen(partida: Partida): Resumen {
  /* Vistas son las que llegaron a pantalla: la que estaba a medias cuando sonó el reloj también. */
  const vistas = partida.aciertos + partida.fallos + (partida.elegida === null && !esVacia(partida) ? 1 : 0);
  const respondidas = partida.aciertos + partida.fallos;
  return {
    puntos: partida.puntos,
    vistas,
    aciertos: partida.aciertos,
    fallos: partida.fallos,
    precision: respondidas === 0 ? 0 : Math.round((partida.aciertos / respondidas) * 100),
    mejorRacha: partida.mejorRacha,
    mayorMultiplicador: partida.mayorMultiplicador,
    rapidas: partida.rapidas,
    fallados: partida.fallados,
  };
}

const esVacia = (partida: Partida): boolean => partida.preguntas.length === 0;
