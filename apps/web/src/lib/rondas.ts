import { describirRonda, etapaDeRonda } from '@athena/domain';
import { nombreFase } from './paises';

/**
 * El nombre de una jornada, en español.
 *
 * Manda el diccionario del dominio, que sabe de rondas de copa —"Round of 16" son los octavos, "8th
 * Finals" también— y de fechas de liga —"Clausura - 4"—. El de fases locales queda como red para lo que
 * el proveedor mande y nadie haya visto todavía; sin ninguno de los dos, la cancha del once y la página
 * del partido mostraban el inglés crudo.
 */
export function etiquetaDeRonda(round: string | null | undefined): string | null {
  if (!round) return null;
  if (etapaDeRonda(round)) return describirRonda(round).label;

  /* "Clausura - 4" → "Clausura · fecha 4": la fase local con su número de fecha. */
  const corte = round.lastIndexOf(' - ');
  if (corte === -1) return nombreFase(round);
  const cola = round.slice(corte + 3).trim();
  return /^\d+$/.test(cola) ? `${nombreFase(round.slice(0, corte))} · fecha ${cola}` : nombreFase(round);
}

/**
 * Cierto cuando una lista de partidos abarca más de una ronda.
 *
 * Es lo que decide si la pastilla de ronda informa o repite: en los últimos resultados de una copa
 * conviven la final y los cuartos y hay que decirlo, y en la fecha 5 de una liga la misma etiqueta ocho
 * veces seguidas es ruido.
 */
export function mezclaRondas(partidos: Array<{ round: string | null }>): boolean {
  return new Set(partidos.map((p) => etiquetaDeRonda(p.round))).size > 1;
}
