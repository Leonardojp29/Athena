/*
 * El color de una nota, sobre el césped.
 *
 * Antes había dos escalones y medio —lima de 7,5 para arriba, oscuro en el medio, rojo abajo— así que
 * el único que se distinguía de un golpe era el rojo: un 6,6 y un 7,4 se veían igual. Ahora son
 * cuatro escalones **macizos** de la misma familia, del lima al rojo, para que la cancha se lea como
 * un mapa de calor. Macizos y no translúcidos: sobre el césped, un chip transparente se ve
 * desvaído —como si el dato estuviera apagado— en lugar de bueno.
 */
export function claseDeNota(nota: number): string {
  if (nota >= 8) return 'bg-primary text-primary-contrast';
  if (nota >= 7) return 'bg-nota-buena text-primary-contrast';
  if (nota >= 6) return 'bg-board text-chalk';
  return 'bg-card-red/85 text-chalk';
}
