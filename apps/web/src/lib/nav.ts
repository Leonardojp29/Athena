import { api } from './api';

export interface NavCompetition {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  format: string;
  logoUrl: string | null;
  region: 'sudamerica' | 'europa' | 'internacional' | 'otras';
}

export interface NavGroup {
  region: NavCompetition['region'];
  label: string;
  competitions: NavCompetition[];
}

const ETIQUETA: Record<NavCompetition['region'], string> = {
  europa: 'Europa',
  sudamerica: 'Sudamérica',
  internacional: 'Internacional',
  otras: 'Otras',
};

const ORDEN: NavCompetition['region'][] = ['sudamerica', 'europa', 'internacional', 'otras'];

/*
 * Las cinco competencias cableadas en el header eran indefendibles con doce sincronizadas.
 * Si la llamada falla se devuelve un mínimo: el header no puede tirar una página abajo.
 */
const RESPALDO: NavCompetition[] = [
  { id: '', name: 'Liga 1', slug: 'primera-division', country: 'Peru', format: 'league', logoUrl: null, region: 'sudamerica' },
  { id: '', name: 'Premier League', slug: 'premier-league', country: 'England', format: 'league', logoUrl: null, region: 'europa' },
  { id: '', name: 'LaLiga', slug: 'la-liga', country: 'Spain', format: 'league', logoUrl: null, region: 'europa' },
  { id: '', name: 'Champions', slug: 'uefa-champions-league', country: null, format: 'cup', logoUrl: null, region: 'internacional' },
  { id: '', name: 'Libertadores', slug: 'conmebol-libertadores', country: null, format: 'cup', logoUrl: null, region: 'internacional' },
];

/* Header y pie piden lo mismo en cada render; el catálogo cambia una vez por temporada. */
const TTL_MS = 300_000;
let cache: { at: number; value: NavGroup[] } | null = null;

export async function getNavGroups(): Promise<NavGroup[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  let competitions: NavCompetition[];
  try {
    competitions = await api<NavCompetition[]>('/views/competitions');
    if (competitions.length === 0) competitions = RESPALDO;
  } catch {
    if (cache) return cache.value;
    competitions = RESPALDO;
  }

  const groups = ORDEN.map((region) => ({
    region,
    label: ETIQUETA[region],
    competitions: competitions.filter((c) => c.region === region),
  })).filter((group) => group.competitions.length > 0);

  cache = { at: Date.now(), value: groups };
  return groups;
}

/** Las que van sueltas en la barra: lo que un hincha busca sin abrir el menú. */
export function destacadas(groups: NavGroup[], limite = 4): NavCompetition[] {
  const todas = groups.flatMap((g) => g.competitions);
  const preferidas = ['primera-division', 'uefa-champions-league', 'conmebol-libertadores', 'premier-league'];
  const elegidas = preferidas
    .map((slug) => todas.find((c) => c.slug === slug))
    .filter((c): c is NavCompetition => c !== undefined);
  return [...elegidas, ...todas.filter((c) => !elegidas.includes(c))].slice(0, limite);
}
