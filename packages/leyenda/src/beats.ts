/**
 * El guion.
 *
 * El motor no devuelve solo un estado nuevo: devuelve **la lista de cosas que pasaron**, en orden, y
 * la interfaz las reproduce como una película. De acá sale que el juego se sienta un videojuego y no
 * un formulario —los goles entran uno por uno, el título ocupa la pantalla, la carta sube de
 * material con su cinemática— sin que la interfaz sepa una sola regla del fútbol.
 *
 * Cada beat declara su propia intensidad, y esa intensidad decide cuánto dura en pantalla: la escala
 * de motion del producto (micro, ui, drama, cine) vive acá y no en cada componente.
 */
import type { ClaseDeMomento, ContextoDeMomento, Nivel, Rol, Temporada, Trofeo } from './estado.js';

export type Intensidad = 'micro' | 'ui' | 'drama' | 'cine';

export type Beat =
  /** Un rótulo de tiempo: "Temporada 2027 · fecha 12". */
  | { clase: 'capitulo'; texto: string; detalle?: string; intensidad: Intensidad }
  | { clase: 'texto'; texto: string; intensidad: Intensidad }
  | { clase: 'debut'; club: string; edad: number; intensidad: 'cine' }
  | { clase: 'gol'; minuto: number; rival: string; competencia: string; intensidad: Intensidad }
  | { clase: 'asistencia'; minuto: number; rival: string; intensidad: 'ui' }
  | { clase: 'tramo'; resumen: ResumenDeTramo; intensidad: 'ui' }
  | { clase: 'lesion'; semanas: number; motivo: string; intensidad: 'drama' }
  | { clase: 'tarjeta'; color: 'amarilla' | 'roja'; motivo: string; intensidad: 'ui' }
  | { clase: 'titular'; texto: string; tono: 'elogio' | 'duda' | 'polemica' | 'neutro'; intensidad: 'ui' }
  | { clase: 'decision'; eventoId: string; intensidad: 'drama' }
  | { clase: 'momento'; momento: ClaseDeMomento; contexto: ContextoDeMomento; intensidad: 'cine' }
  | { clase: 'carta'; de: Nivel; a: Nivel; ovr: number; intensidad: 'cine' }
  | { clase: 'ovr'; de: number; a: number; intensidad: 'drama' }
  | { clase: 'trofeo'; trofeo: Trofeo; intensidad: 'cine' }
  | { clase: 'premio'; nombre: string; temporada: number; intensidad: 'cine' }
  | { clase: 'temporada'; temporada: Temporada; intensidad: 'drama' }
  | { clase: 'rol'; de: Rol; a: Rol; intensidad: 'drama' }
  | { clase: 'seleccion'; texto: string; intensidad: 'drama' }
  | { clase: 'fichaje'; club: string; desde: string | null; matices: string[]; intensidad: 'cine' }
  | { clase: 'mercado'; cuantas: number; intensidad: 'ui' }
  | { clase: 'recuerdo'; texto: string; anio: number; intensidad: 'drama' }
  | { clase: 'retiro'; club: string; edad: number; enCasa: boolean; intensidad: 'cine' };

export interface ResumenDeTramo {
  rotulo: string;
  partidos: number;
  goles: number;
  asistencias: number;
  nota: number;
  posicion: number | null;
}

/** Cuánto respira cada beat en pantalla, en milisegundos. */
export const DURACION: Record<Intensidad, number> = {
  micro: 140,
  ui: 320,
  drama: 620,
  cine: 1100,
};

export interface Avance<T> {
  carrera: T;
  beats: Beat[];
}

/** Acumulador de beats: el motor lo pasa por las funciones internas y sale el guion armado. */
export class Guion {
  private readonly lista: Beat[] = [];

  agregar(beat: Beat): void {
    this.lista.push(beat);
  }

  capitulo(texto: string, detalle?: string): void {
    this.lista.push({ clase: 'capitulo', texto, detalle, intensidad: 'ui' });
  }

  texto(texto: string, intensidad: Intensidad = 'ui'): void {
    this.lista.push({ clase: 'texto', texto, intensidad });
  }

  get beats(): Beat[] {
    return this.lista;
  }
}
