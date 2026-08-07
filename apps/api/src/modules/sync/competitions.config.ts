/**
 * El catálogo de Athena, en el orden en que se lee: continente → país → torneos.
 *
 * Todos los IDs se verificaron contra `/leagues?country=X&current=true` el 2026-08-07. No se
 * usa un comodín por país a propósito: el proveedor lista los estaduales brasileños, las
 * categorías juveniles y las ligas femeninas en el mismo lugar —Brasil solo tiene 108
 * competencias— y un comodín inundaría la navegación con torneos que este producto no cubre.
 *
 * El criterio es explícito: la primera división masculina de cada país y sus copas
 * nacionales. Las regionales, las divisiones de ascenso, las juveniles y las femeninas quedan
 * fuera de esta versión.
 */
export type Continent = 'sudamerica' | 'europa' | 'norteamerica' | 'africa' | 'asia' | 'mundial';

export interface ConfiguredCompetition {
  providerRef: string;
  label: string;
  /** Código ISO del país, o null en los torneos internacionales. */
  countryCode: string | null;
  continent: Continent;
}

export const CONFIGURED_COMPETITIONS: readonly ConfiguredCompetition[] = [
  // ---------- Sudamérica ----------
  { providerRef: '128', label: 'Liga Profesional Argentina', countryCode: 'AR', continent: 'sudamerica' },
  { providerRef: '130', label: 'Copa Argentina', countryCode: 'AR', continent: 'sudamerica' },
  { providerRef: '71', label: 'Brasileirão Serie A', countryCode: 'BR', continent: 'sudamerica' },
  { providerRef: '73', label: 'Copa do Brasil', countryCode: 'BR', continent: 'sudamerica' },
  { providerRef: '632', label: 'Supercopa do Brasil', countryCode: 'BR', continent: 'sudamerica' },
  { providerRef: '281', label: 'Liga 1 Perú', countryCode: 'PE', continent: 'sudamerica' },
  { providerRef: '1232', label: 'Copa de la Liga (Perú)', countryCode: 'PE', continent: 'sudamerica' },
  { providerRef: '265', label: 'Primera División de Chile', countryCode: 'CL', continent: 'sudamerica' },
  { providerRef: '267', label: 'Copa Chile', countryCode: 'CL', continent: 'sudamerica' },
  { providerRef: '239', label: 'Primera A (Colombia)', countryCode: 'CO', continent: 'sudamerica' },
  { providerRef: '241', label: 'Copa Colombia', countryCode: 'CO', continent: 'sudamerica' },
  { providerRef: '268', label: 'Primera División de Uruguay', countryCode: 'UY', continent: 'sudamerica' },
  { providerRef: '1212', label: 'Copa AUF Uruguay', countryCode: 'UY', continent: 'sudamerica' },
  { providerRef: '242', label: 'LigaPro Ecuador', countryCode: 'EC', continent: 'sudamerica' },
  { providerRef: '853', label: 'Supercopa de Ecuador', countryCode: 'EC', continent: 'sudamerica' },

  // ---------- Europa ----------
  { providerRef: '39', label: 'Premier League', countryCode: 'GB-ENG', continent: 'europa' },
  { providerRef: '45', label: 'FA Cup', countryCode: 'GB-ENG', continent: 'europa' },
  { providerRef: '48', label: 'Carabao Cup', countryCode: 'GB-ENG', continent: 'europa' },
  { providerRef: '140', label: 'LaLiga', countryCode: 'ES', continent: 'europa' },
  { providerRef: '143', label: 'Copa del Rey', countryCode: 'ES', continent: 'europa' },
  { providerRef: '556', label: 'Supercopa de España', countryCode: 'ES', continent: 'europa' },
  { providerRef: '135', label: 'Serie A', countryCode: 'IT', continent: 'europa' },
  { providerRef: '137', label: 'Coppa Italia', countryCode: 'IT', continent: 'europa' },
  { providerRef: '78', label: 'Bundesliga', countryCode: 'DE', continent: 'europa' },
  { providerRef: '81', label: 'DFB-Pokal', countryCode: 'DE', continent: 'europa' },
  { providerRef: '529', label: 'Supercopa de Alemania', countryCode: 'DE', continent: 'europa' },
  { providerRef: '61', label: 'Ligue 1', countryCode: 'FR', continent: 'europa' },
  { providerRef: '66', label: 'Copa de Francia', countryCode: 'FR', continent: 'europa' },
  { providerRef: '526', label: 'Trofeo de Campeones (Francia)', countryCode: 'FR', continent: 'europa' },
  { providerRef: '94', label: 'Primeira Liga', countryCode: 'PT', continent: 'europa' },
  { providerRef: '96', label: 'Copa de Portugal', countryCode: 'PT', continent: 'europa' },
  { providerRef: '97', label: 'Copa de la Liga (Portugal)', countryCode: 'PT', continent: 'europa' },
  { providerRef: '88', label: 'Eredivisie', countryCode: 'NL', continent: 'europa' },
  { providerRef: '90', label: 'Copa de Países Bajos', countryCode: 'NL', continent: 'europa' },

  // ---------- Norteamérica ----------
  { providerRef: '262', label: 'Liga MX', countryCode: 'MX', continent: 'norteamerica' },
  { providerRef: '857', label: 'Campeón de Campeones', countryCode: 'MX', continent: 'norteamerica' },
  { providerRef: '253', label: 'Major League Soccer', countryCode: 'US', continent: 'norteamerica' },
  { providerRef: '257', label: 'US Open Cup', countryCode: 'US', continent: 'norteamerica' },
  { providerRef: '479', label: 'Canadian Premier League', countryCode: 'CA', continent: 'norteamerica' },
  { providerRef: '259', label: 'Campeonato de Canadá', countryCode: 'CA', continent: 'norteamerica' },

  // ---------- África ----------
  { providerRef: '233', label: 'Premier League de Egipto', countryCode: 'EG', continent: 'africa' },
  { providerRef: '714', label: 'Copa de Egipto', countryCode: 'EG', continent: 'africa' },
  { providerRef: '539', label: 'Supercopa de Egipto', countryCode: 'EG', continent: 'africa' },

  // ---------- Asia ----------
  { providerRef: '307', label: 'Saudi Pro League', countryCode: 'SA', continent: 'asia' },
  { providerRef: '504', label: "Copa del Rey de Arabia Saudita", countryCode: 'SA', continent: 'asia' },
  { providerRef: '826', label: 'Supercopa de Arabia Saudita', countryCode: 'SA', continent: 'asia' },
  { providerRef: '98', label: 'J1 League', countryCode: 'JP', continent: 'asia' },
  { providerRef: '101', label: 'Copa de la J-League', countryCode: 'JP', continent: 'asia' },
  { providerRef: '102', label: 'Copa del Emperador', countryCode: 'JP', continent: 'asia' },

  // ---------- Internacional de clubes ----------
  { providerRef: '2', label: 'UEFA Champions League', countryCode: null, continent: 'mundial' },
  { providerRef: '3', label: 'UEFA Europa League', countryCode: null, continent: 'mundial' },
  { providerRef: '848', label: 'UEFA Conference League', countryCode: null, continent: 'mundial' },
  { providerRef: '531', label: 'Supercopa de Europa', countryCode: null, continent: 'mundial' },
  { providerRef: '13', label: 'CONMEBOL Libertadores', countryCode: null, continent: 'mundial' },
  { providerRef: '11', label: 'CONMEBOL Sudamericana', countryCode: null, continent: 'mundial' },
  { providerRef: '541', label: 'CONMEBOL Recopa', countryCode: null, continent: 'mundial' },
  { providerRef: '16', label: 'Concacaf Champions Cup', countryCode: null, continent: 'mundial' },
  { providerRef: '772', label: 'Leagues Cup', countryCode: null, continent: 'mundial' },
  { providerRef: '17', label: 'AFC Champions League Elite', countryCode: null, continent: 'mundial' },
  { providerRef: '12', label: 'CAF Champions League', countryCode: null, continent: 'mundial' },
  { providerRef: '15', label: 'Mundial de Clubes', countryCode: null, continent: 'mundial' },
] as const;
