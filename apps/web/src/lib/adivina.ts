import type { FutbolistaBuscado, RetoParaJugar, TitularRevelado } from './api';
import type { Catalogo, Dificultad, DificultadElegida } from '@athena/adivina-el-xi';

const CLAVE = 'athena:once';
const VERSION = 1;
/* Cuántos retos recuerda para no repetirlos. El catálogo más chico tiene siete por dificultad. */
const MEMORIA = 12;

export interface Preferencias {
  catalogo: Catalogo;
  dificultad: DificultadElegida;
  conTiempo: boolean;
  jugados: string[];
}

export const PREFERENCIAS_POR_OMISION: Preferencias = {
  catalogo: 'mixto',
  dificultad: 'normal',
  conTiempo: true,
  jugados: [],
};

const CATALOGOS = new Set(['internacional', 'peruano', 'mixto', 'aleatorio']);
const DIFICULTADES = new Set(['facil', 'normal', 'dificil', 'aleatorio']);

/** Lectura defensiva: un `localStorage` bloqueado o un formato viejo no pueden romper el juego. */
export function leerPreferencias(): Preferencias {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return PREFERENCIAS_POR_OMISION;
    const guardado = JSON.parse(crudo) as { version?: number } & Partial<Preferencias>;
    if (guardado.version !== VERSION) return PREFERENCIAS_POR_OMISION;
    return {
      catalogo: CATALOGOS.has(guardado.catalogo ?? '') ? (guardado.catalogo as Catalogo) : 'mixto',
      dificultad: DIFICULTADES.has(guardado.dificultad ?? '')
        ? (guardado.dificultad as DificultadElegida)
        : 'normal',
      conTiempo: guardado.conTiempo !== false,
      jugados: Array.isArray(guardado.jugados) ? guardado.jugados.slice(0, MEMORIA) : [],
    };
  } catch {
    return PREFERENCIAS_POR_OMISION;
  }
}

export function guardarPreferencias(preferencias: Preferencias): void {
  try {
    localStorage.setItem(
      CLAVE,
      JSON.stringify({ version: VERSION, ...preferencias, jugados: preferencias.jugados.slice(0, MEMORIA) }),
    );
  } catch {
    /* Sin dónde guardar, el juego sigue; solo se olvida lo elegido al recargar. */
  }
}

export const recordar = (jugados: string[], clave: string): string[] =>
  [clave, ...jugados.filter((x) => x !== clave)].slice(0, MEMORIA);

export async function pedirReto(
  catalogo: 'internacional' | 'peruano',
  dificultad: Dificultad,
  jugados: string[],
): Promise<RetoParaJugar> {
  const parametros = new URLSearchParams({ catalogo, dificultad, excluir: jugados.join(',') });
  const respuesta = await fetch(`/juegos/adivina-el-xi/reto.json?${parametros}`);
  if (!respuesta.ok) throw new Error('sin reto');
  return (await respuesta.json()) as RetoParaJugar;
}

export async function pedirSolucion(clave: string): Promise<TitularRevelado[]> {
  const respuesta = await fetch(`/juegos/adivina-el-xi/solucion.json?clave=${clave}`);
  if (!respuesta.ok) throw new Error('sin solución');
  return ((await respuesta.json()) as { titulares: TitularRevelado[] }).titulares;
}

export async function buscarFutbolistas(
  consulta: string,
  señal: AbortSignal,
): Promise<FutbolistaBuscado[]> {
  const respuesta = await fetch(
    `/juegos/adivina-el-xi/jugadores.json?q=${encodeURIComponent(consulta)}`,
    { signal: señal },
  );
  if (!respuesta.ok) return [];
  return ((await respuesta.json()) as { resultados: FutbolistaBuscado[] }).resultados;
}

/** "Lionel Messi" → "Messi". Lo que un hincha diría si le preguntaran quién jugó. */
export const apellidoDe = (nombre: string): string => nombre.trim().split(/\s+/).pop() ?? nombre;

export const relojDe = (ms: number): string => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
