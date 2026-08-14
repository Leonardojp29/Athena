import { describirRonda, etapaDeRonda } from '@athena/domain';
import { nombreFase } from './paises';

/**
 * El nombre de una jornada, en español.
 *
 * Dos diccionarios y en este orden: el del dominio, que sabe de rondas de copa —"Round of 16" son los
 * octavos, "8th Finals" también—, y el de fases locales, que sabe de "Clausura - 4". Sin el primero, la
 * cancha del once y la página del partido mostraban el inglés crudo del proveedor.
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
