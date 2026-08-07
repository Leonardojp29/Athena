/**
 * El catálogo se lee continente → país → torneos, y ese orden vive en los datos: cada
 * competencia trae su `continent` y su `countryCode`.
 *
 * Antes acá había un mapa de nombres de país en inglés que decidía la región. Con doce
 * competencias pasaba; con sesenta era una lista que había que editar en cada liga nueva y que
 * mandaba a "otras" todo lo que no estuviera escrito.
 */
export type Continent = 'sudamerica' | 'europa' | 'norteamerica' | 'africa' | 'asia' | 'mundial';

export const CONTINENT_LABEL: Record<Continent, string> = {
  sudamerica: 'Sudamérica',
  europa: 'Europa',
  norteamerica: 'Norteamérica',
  africa: 'África',
  asia: 'Asia',
  mundial: 'Internacional',
};

/* El orden de la navegación: primero lo que mira este público, al final las copas de clubes. */
export const CONTINENT_ORDER: Continent[] = [
  'sudamerica',
  'europa',
  'mundial',
  'norteamerica',
  'asia',
  'africa',
];

/**
 * Dentro de un país, la liga va antes que sus copas y la copa principal antes que la supercopa.
 * El proveedor no ordena nada, y una lista alfabética pondría "Copa Argentina" arriba de la
 * "Liga Profesional".
 */
export function competitionRank(format: string, name: string): number {
  if (format === 'league') return 0;
  if (/supercopa|super cup|campeón de campeones|trofeo/i.test(name)) return 2;
  return 1;
}

/* Perú primero: es el público de esta versión. Después, peso futbolístico del continente. */
const COUNTRY_ORDER: Record<string, number> = {
  PE: 0,
  AR: 1,
  BR: 2,
  CO: 3,
  CL: 4,
  UY: 5,
  EC: 6,
  ES: 10,
  'GB-ENG': 11,
  IT: 12,
  DE: 13,
  FR: 14,
  PT: 15,
  NL: 16,
  MX: 20,
  US: 21,
  CA: 22,
  SA: 30,
  JP: 31,
  EG: 40,
};

export function countryRank(code: string | null): number {
  if (code === null) return 99;
  return COUNTRY_ORDER[code] ?? 50;
}
