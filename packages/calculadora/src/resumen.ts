import type { Equipo, Fila, Partido, Pronosticos, ReglasLiga, Tabla } from './tipos.js';

/*
 * Qué dice el escenario, en una frase.
 *
 * Sirve para dos cosas que son la misma: la tarjeta que se mira antes de compartir y el texto que
 * WhatsApp muestra cuando alguien pega el enlace. Las dos salen de acá para que no puedan decir
 * cosas distintas.
 *
 * La frase cambia según cuánto se pronosticó, y eso no es un detalle: con la fecha entera cargada
 * "sale campeón" es una conclusión del escenario; con tres partidos puestos es "va primero", que
 * es lo único cierto. Athena no adorna un dato para que suene mejor.
 */

export interface Resumen {
  torneo: string;
  campeon: Equipo | null;
  puntos: number;
  /** Cuando faltan partidos por pronosticar, el líder todavía no es campeón. */
  cerrado: boolean;
  faltan: number;
  libertadores: Equipo[];
  sudamericana: Equipo[];
  descenso: Equipo[];
  puestos: number;
}

const PRONOSTICABLE = new Set(['scheduled', 'postponed']);

function equiposDe(tabla: Tabla | undefined, desde: number, hasta: number): Equipo[] {
  return (tabla?.filas ?? [])
    .filter((fila: Fila) => fila.posicion >= desde && fila.posicion <= hasta)
    .map((fila) => fila.equipo);
}

export function resumir(
  tablas: readonly Tabla[],
  reglas: ReglasLiga,
  claveEnJuego: string,
  partidos: readonly Partido[],
  pronosticos: Pronosticos,
): Resumen | null {
  const enJuego = tablas.find((t) => t.clave === claveEnJuego);
  const definicion = reglas.tablas.find((t) => t.clave === claveEnJuego);
  if (!enJuego || !definicion) return null;

  const abiertos = partidos.filter(
    (p) =>
      PRONOSTICABLE.has(p.estado) &&
      (definicion.fases.length === 0 || definicion.fases.includes(p.fase)),
  );
  const faltan = abiertos.filter((p) => !pronosticos.has(p.id)).length;

  const acumulada = tablas.find((t) => t.clave === reglas.claveAcumulada);
  const zonas = reglas.tablas.find((t) => t.clave === reglas.claveAcumulada)?.zonas ?? [];
  const rango = (nombre: string) => zonas.find((z) => z.zona === nombre);
  const lib = rango('libertadores');
  const sud = rango('sudamericana');
  const baja = rango('descenso');

  const lider = enJuego.filas[0];

  return {
    torneo: definicion.titulo,
    campeon: lider?.equipo ?? null,
    puntos: lider?.puntos ?? 0,
    cerrado: faltan === 0,
    faltan,
    libertadores: lib ? equiposDe(acumulada, lib.desde, lib.hasta) : [],
    sudamericana: sud ? equiposDe(acumulada, sud.desde, sud.hasta) : [],
    descenso: baja ? equiposDe(acumulada, baja.desde, baja.hasta) : [],
    puestos: pronosticos.size,
  };
}

/** La misma frase en la tarjeta y en la vista previa del enlace. */
export function frase(resumen: Resumen | null): string | null {
  if (!resumen?.campeon) return null;
  const verbo = resumen.cerrado ? 'campeón del' : 'puntero del';
  return `Mi predicción: ${resumen.campeon.nombre}, ${verbo} ${resumen.torneo} con ${resumen.puntos} puntos`;
}

export function detalle(resumen: Resumen | null): string | null {
  if (!resumen) return null;
  const partes: string[] = [];
  if (resumen.libertadores.length > 0) {
    partes.push(`Libertadores: ${resumen.libertadores.map((e) => e.nombre).join(', ')}`);
  }
  if (resumen.descenso.length > 0) {
    partes.push(`Descienden: ${resumen.descenso.map((e) => e.nombre).join(' y ')}`);
  }
  if (!resumen.cerrado) {
    partes.push(`Faltan ${resumen.faltan} partidos por definir`);
  }
  return partes.length > 0 ? partes.join(' · ') : null;
}
