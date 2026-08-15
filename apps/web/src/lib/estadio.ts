/**
 * El vocabulario de los estadios.
 *
 * El proveedor manda la superficie en inglés y con su propia lista cerrada. Se traduce lo que existe
 * de verdad en la base —`grass`, `artificial turf`, `sand pitch`— y lo que no se reconoce **no se
 * muestra**: escribir "artificial turf" en una página en español es el mismo error que mostrar
 * "Round of 16" en un cuadro.
 */
const SUPERFICIE: Record<string, string> = {
  grass: 'Césped natural',
  'artificial turf': 'Césped sintético',
  'sand pitch': 'Arena',
};

export function superficieEnEspanol(superficie: string | null | undefined): string | null {
  if (!superficie) return null;
  return SUPERFICIE[superficie.trim().toLowerCase()] ?? null;
}

/** El aforo con separador de miles; null cuando el proveedor no lo publica. */
export function aforo(capacidad: number | null | undefined): string | null {
  return capacidad === null || capacidad === undefined || capacidad <= 0
    ? null
    : capacidad.toLocaleString('es-PE');
}
