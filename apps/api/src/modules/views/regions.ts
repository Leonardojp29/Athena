/**
 * Agrupación por región para la navegación. Las competencias sin país (o que no son liga)
 * son internacionales: la Champions no pertenece a ningún país.
 */
export type Region = 'sudamerica' | 'europa' | 'internacional' | 'otras';

const REGION_BY_COUNTRY: Record<string, Region> = {
  Peru: 'sudamerica',
  Brazil: 'sudamerica',
  Argentina: 'sudamerica',
  Chile: 'sudamerica',
  Colombia: 'sudamerica',
  Uruguay: 'sudamerica',
  Ecuador: 'sudamerica',
  Paraguay: 'sudamerica',
  Bolivia: 'sudamerica',
  Venezuela: 'sudamerica',
  England: 'europa',
  Spain: 'europa',
  Italy: 'europa',
  Germany: 'europa',
  France: 'europa',
  Portugal: 'europa',
  Netherlands: 'europa',
  Belgium: 'europa',
};

export const REGION_LABEL: Record<Region, string> = {
  sudamerica: 'Sudamérica',
  europa: 'Europa',
  internacional: 'Internacional',
  otras: 'Otras',
};

export function regionOf(country: string | null, format: string): Region {
  if (!country) return 'internacional';
  const region = REGION_BY_COUNTRY[country];
  if (region) return region;
  return format === 'league' ? 'otras' : 'internacional';
}
