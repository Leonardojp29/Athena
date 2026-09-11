/*
 * El color de una nota, sobre el césped.
 *
 * Antes había dos escalones y medio —lima de 7,5 para arriba, oscuro en el medio, rojo abajo— así que
 * el único que se distinguía de un golpe era el rojo: un 6,6 y un 7,4 se veían igual. Ahora son seis
 * escalones **macizos**, para que la cancha se lea como un mapa de calor. Macizos y no translúcidos:
 * sobre el césped, un chip transparente se ve desvaído —como si el dato estuviera apagado— en lugar
 * de bueno.
 *
 * Arriba del lima hay dos escalones más, porque un 9 no es un 8 y un 10 es una vez al año: el cian
 * —el color con el que Athena marca los datos— rompe con todos los verdes de la cancha, y el diez se
 * lleva el dorado con aro, que es el único chip que no se parece a ningún otro.
 */
export function claseDeNota(nota: number): string {
  if (nota >= 10) return 'bg-card-yellow text-board ring-2 ring-inset ring-chalk/80';
  if (nota >= 9) return 'bg-data text-board';
  if (nota >= 8) return 'bg-win text-win-contrast';
  if (nota >= 7) return 'bg-nota-buena text-nota-buena-contrast';
  if (nota >= 6) return 'bg-board text-chalk';
  return 'bg-card-red/85 text-chalk';
}
