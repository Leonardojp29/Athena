import { faseDeJornada } from '@athena/domain';
import type { Partido } from './tipos.js';

/**
 * La fase de un partido sale de su jornada y no de la tabla: "Clausura - 9" la nombra. Es la
 * misma regla que ya decide qué tabla se abre en la página de una competencia, así que vive en
 * `@athena/domain` y acá solo se aplica.
 */
export function conFase<T extends { ronda: string }>(partidos: readonly T[]): Array<T & { fase: string }> {
  return partidos.map((partido) => ({ ...partido, fase: faseDeJornada(partido.ronda) ?? '' }));
}

export function fasesDe(partidos: readonly Partido[]): string[] {
  return [...new Set(partidos.map((p) => p.fase))].filter((f) => f !== '');
}
