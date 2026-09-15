import { fotoDeFutbolista } from './entorno';
import type { PreguntaParaJugar } from './api';
import type { Pregunta } from '@athena/sesenta-segundos';

const CLAVE = 'athena:sesenta';
const VERSION = 1;

/** Que el resto de la web lo sepa sin sondear el almacenamiento en cada render. */
export const EVENTO_SESENTA = 'athena:sesenta';

/**
 * Lo que queda de las partidas.
 *
 * Cinco cifras y ninguna fecha, por la misma razón que en El Impostor: un récord es un número que
 * invita a volver, no un archivo de partidas que las convierte en museo.
 */
export interface Marcas {
  mejorPuntaje: number;
  masCorrectas: number;
  mejorRacha: number;
  partidas: number;
  correctasTotales: number;
}

export const MARCAS_VACIAS: Marcas = {
  mejorPuntaje: 0,
  masCorrectas: 0,
  mejorRacha: 0,
  partidas: 0,
  correctasTotales: 0,
};

const entero = (valor: unknown): number =>
  typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 ? Math.floor(valor) : 0;

/** Lectura defensiva: un `localStorage` bloqueado o un formato viejo no pueden romper el juego. */
export function leerMarcas(): Marcas {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return MARCAS_VACIAS;
    const guardado = JSON.parse(crudo) as { version?: number } & Partial<Marcas>;
    if (guardado.version !== VERSION) return MARCAS_VACIAS;
    return {
      mejorPuntaje: entero(guardado.mejorPuntaje),
      masCorrectas: entero(guardado.masCorrectas),
      mejorRacha: entero(guardado.mejorRacha),
      partidas: entero(guardado.partidas),
      correctasTotales: entero(guardado.correctasTotales),
    };
  } catch {
    return MARCAS_VACIAS;
  }
}

export interface Cierre {
  puntos: number;
  aciertos: number;
  mejorRacha: number;
}

export interface Resultado {
  marcas: Marcas;
  /** Verdadero cuando esta partida superó lo mejor que había. Lo usa la animación del final. */
  record: boolean;
}

export function anotarPartida(cierre: Cierre): Resultado {
  const previas = leerMarcas();
  const record = cierre.puntos > previas.mejorPuntaje;
  const marcas: Marcas = {
    mejorPuntaje: Math.max(previas.mejorPuntaje, cierre.puntos),
    masCorrectas: Math.max(previas.masCorrectas, cierre.aciertos),
    mejorRacha: Math.max(previas.mejorRacha, cierre.mejorRacha),
    partidas: previas.partidas + 1,
    correctasTotales: previas.correctasTotales + cierre.aciertos,
  };
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ version: VERSION, ...marcas }));
  } catch {
    /* Sin dónde guardar, el juego sigue: lo único que se pierde es el récord al recargar. */
  }
  window.dispatchEvent(new Event(EVENTO_SESENTA));
  return { marcas, record };
}

export async function pedirPreguntas(): Promise<Pregunta[]> {
  const respuesta = await fetch('/juegos/60-segundos/preguntas.json');
  if (!respuesta.ok) throw new Error('sin preguntas');
  const cuerpo = (await respuesta.json()) as { preguntas: PreguntaParaJugar[] };
  if (cuerpo.preguntas.length === 0) throw new Error('sin preguntas');
  return cuerpo.preguntas.map((p) => ({
    ...p,
    dificultad: p.dificultad as Pregunta['dificultad'],
  }));
}

/** La foto no viaja en la respuesta: el proveedor la sirve por id y con eso alcanza. */
export const fotoDe = fotoDeFutbolista;

/** El reloj con décimas: `60.0 → 59.9`. Es el protagonista del juego. */
export const relojDe = (ms: number): string => (Math.ceil(ms / 100) / 10).toFixed(1);

export const NOMBRE_DE_DIFICULTAD: Record<string, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
};
