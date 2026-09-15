import { fotoDeFutbolista } from './entorno';
import type { FutbolistaBuscado, IndiceDeFutbolistas, RetoParaJugar, TitularRevelado } from './api';
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

/** La foto no viaja en ninguna respuesta: el proveedor la sirve por id y con eso alcanza. */
export const fotoDe = fotoDeFutbolista;

/* ── El índice local ───────────────────────────────────────────────────────────────────────── */

interface FichaDelIndice {
  ref: string;
  nombre: string;
  /** Sin tildes y en minúscula, calculado una sola vez al cargar. */
  llano: string;
  apellido: string;
  /** La posición en el índice, que viene ordenado por fama. Desempata igual que en el servidor. */
  puesto: number;
}

let indice: FichaDelIndice[] | null = null;
let cargando: Promise<FichaDelIndice[]> | null = null;

const sinTildes = (texto: string): string =>
  texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/**
 * Baja el índice una sola vez por pestaña.
 *
 * Se llama al arrancar la presentación del reto, así los tres segundos de contexto y cuenta
 * regresiva se usan para tenerlo listo antes del primer tecleo. Un fallo no se memoriza: el
 * buscador sigue andando contra el servidor, solo que más lento.
 */
export function cargarIndice(): Promise<FichaDelIndice[]> {
  if (indice) return Promise.resolve(indice);
  if (cargando) return cargando;

  cargando = fetch('/juegos/adivina-el-xi/indice.json')
    .then((r) => (r.ok ? r.json() : { jugadores: [] }))
    .then((cuerpo: IndiceDeFutbolistas) => {
      indice = cuerpo.jugadores.map(([ref, nombre], puesto) => {
        const llano = sinTildes(nombre);
        return { ref, nombre, llano, apellido: llano.split(' ').pop() ?? llano, puesto };
      });
      return indice;
    })
    .catch(() => {
      cargando = null;
      return [];
    });

  return cargando;
}

/**
 * La misma escalera de premios que el servidor, en el navegador.
 *
 * El apellido manda sobre el principio de la ficha —quien escribe "messi" busca a Lionel Messi y no
 * a Messias—, el nombre abreviado pierde un poco, y desempata la fama, que acá es la posición en el
 * índice porque llega ordenado.
 */
export function buscarEnIndice(consulta: string, tope = 8): FutbolistaBuscado[] {
  if (!indice) return [];
  const q = sinTildes(consulta.trim());
  if (q.length === 0) return [];

  const puntuados: Array<{ ficha: FichaDelIndice; puntaje: number }> = [];
  for (const ficha of indice) {
    let puntaje = 0;
    if (ficha.apellido === q) puntaje = 1.2;
    else if (ficha.apellido.startsWith(q)) puntaje = 0.7;
    else if (ficha.llano.startsWith(q)) puntaje = 0.6;
    else if (ficha.llano.includes(` ${q}`)) puntaje = 0.3;
    else if (ficha.llano.includes(q)) puntaje = 0.15;
    else continue;

    if (/(^|\s)\w\.(\s|$)/.test(ficha.nombre)) puntaje -= 0.25;
    /* La fama, comprimida igual que en el servidor: medio punto para el más conocido. */
    puntaje += Math.max(0, 0.5 - ficha.puesto / 24_000);
    puntuados.push({ ficha, puntaje });
  }

  return puntuados
    .sort((a, b) => b.puntaje - a.puntaje || a.ficha.nombre.localeCompare(b.ficha.nombre))
    .slice(0, tope)
    .map(({ ficha }) => ({ ref: ficha.ref, nombre: ficha.nombre }));
}

/** "Lionel Messi" → "Messi". Lo que un hincha diría si le preguntaran quién jugó. */
export const apellidoDe = (nombre: string): string => nombre.trim().split(/\s+/).pop() ?? nombre;

export const relojDe = (ms: number): string => {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};
