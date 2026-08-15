/**
 * El catálogo se lee continente → país → torneos, y ese orden vive en los datos: cada
 * competencia trae su `continent` y su `countryCode`.
 *
 * Antes acá había un mapa de nombres de país en inglés que decidía la región. Con doce
 * competencias pasaba; con sesenta era una lista que había que editar en cada liga nueva y que
 * mandaba a "otras" todo lo que no estuviera escrito.
 */
export type Continent =
  | 'sudamerica'
  | 'europa'
  | 'norteamerica'
  | 'africa'
  | 'asia'
  | 'oceania'
  | 'mundial';

export const CONTINENT_LABEL: Record<Continent, string> = {
  sudamerica: 'Sudamérica',
  europa: 'Europa',
  norteamerica: 'Norteamérica',
  africa: 'África',
  asia: 'Asia',
  oceania: 'Oceanía',
  mundial: 'Mundial',
};

/*
 * En el fútbol de selecciones la región **es** la confederación: nadie dice "el torneo sudamericano
 * de selecciones", dice la Copa América de Conmebol. Y el Mundial va primero, que para eso es el
 * Mundial: en el árbol de clubes el mismo grupo va último porque ahí es el de clubes, una vez al año.
 */
export const CONFEDERATION_LABEL: Record<Continent, string> = {
  mundial: 'FIFA',
  sudamerica: 'Conmebol',
  europa: 'UEFA',
  norteamerica: 'Concacaf',
  africa: 'CAF',
  asia: 'AFC',
  oceania: 'OFC',
};

export const CONFEDERATION_ORDER: Continent[] = [
  'mundial',
  'sudamerica',
  'europa',
  'norteamerica',
  'africa',
  'asia',
  'oceania',
];

/*
 * El orden de la navegación: primero lo que mira este público. El Mundial de Clubes va al final
 * porque es una vez al año; las demás copas de clubes viven dentro de su continente.
 */
export const CONTINENT_ORDER: Continent[] = [
  'sudamerica',
  'europa',
  'norteamerica',
  'asia',
  'africa',
  'oceania',
  'mundial',
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

/**
 * Las copas de la confederación no se ordenan alfabéticamente: la Champions va antes que la
 * Conference y la Libertadores antes que la Recopa. Es la jerarquía real del fútbol de clubes.
 */
export function continentalRank(name: string): number {
  if (/champions league|libertadores/i.test(name)) return 0;
  if (/europa league|sudamericana/i.test(name)) return 1;
  if (/conference|leagues cup/i.test(name)) return 2;
  if (/super ?copa|super cup|recopa/i.test(name)) return 3;
  return 4;
}

/**
 * En selecciones el orden es el peso del torneo, no el alfabeto: el Mundial abre, después la copa
 * de la confederación, después las eliminatorias —que son el camino al primero— y al final lo
 * ocasional. Alfabéticamente, la Finalissima le ganaba el primer renglón al Mundial.
 */
export function nationalRank(name: string): number {
  if (/^mundial$/i.test(name)) return 0;
  if (/^(copa américa|eurocopa|copa áfrica|copa oro|copa asia)/i.test(name)) return 1;
  if (/nations league/i.test(name)) return 2;
  if (/eliminatorias/i.test(name)) return 3;
  if (/repechaje/i.test(name)) return 4;
  return 5;
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
