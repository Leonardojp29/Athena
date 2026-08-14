/*
 * El color de una nota, sobre el césped.
 *
 * Antes había dos escalones y medio —lima de 7,5 para arriba, oscuro en el medio, rojo abajo— así que
 * el único que se distinguía de un golpe era el rojo: un 6,6 y un 7,4 se veían igual. Ahora son
 * cuatro escalones de la misma familia, del lima macizo al rojo, para que la cancha se lea como un
 * mapa de calor sin inventar colores nuevos ni robarle el verde al "en vivo".
 */
export function claseDeNota(nota: number): string {
  if (nota >= 8) return 'bg-primary text-primary-contrast';
  if (nota >= 7) return 'bg-primary/30 text-primary-ink ring-1 ring-inset ring-primary/50';
  if (nota >= 6) return 'bg-board text-chalk';
  return 'bg-card-red/85 text-chalk';
}
