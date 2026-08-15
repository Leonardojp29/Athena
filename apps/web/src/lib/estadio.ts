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

/**
 * Fotos propias, para los estadios donde la del proveedor no es de ese estadio.
 *
 * La imagen que API-Football publica para el Monumental de Lima es una toma aérea del Estadio
 * Nacional, que está a quince kilómetros. Antes que mostrar el estadio equivocado en la página del
 * club más grande del Perú, va una foto con licencia libre y su crédito: eso lo exige la licencia y
 * además es la misma regla de siempre, que cada cosa diga de dónde salió.
 *
 * Es una lista de casos, no un mecanismo. La clave es el nombre y la ciudad porque son lo que se ve.
 */
interface FotoPropia {
  url: string;
  credito: string;
}

const FOTOS_PROPIAS: Record<string, FotoPropia> = {
  'estadio monumental|lima': {
    url: '/estadios/estadio-monumental-lima.jpg',
    credito: 'Foto: MicroX · CC BY-SA 3.0',
  },
};

export function fotoDeEstadio(
  venue: { name: string; city: string | null; imageUrl?: string | null },
): { url: string; credito: string | null } | null {
  const propia = FOTOS_PROPIAS[`${venue.name.trim().toLowerCase()}|${(venue.city ?? '').trim().toLowerCase()}`];
  if (propia) return { url: propia.url, credito: propia.credito };
  return venue.imageUrl ? { url: venue.imageUrl, credito: null } : null;
}
