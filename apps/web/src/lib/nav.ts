import { api } from './api';

/*
 * El catálogo llega del API ya ordenado continente → país → torneos. La web no vuelve a
 * agrupar ni a decidir el orden: antes tenía su propio mapa de países y las dos listas se
 * desincronizaban en cada liga nueva.
 */
export type Continent = 'sudamerica' | 'europa' | 'norteamerica' | 'africa' | 'asia' | 'mundial';

export interface NavCompetition {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  countryCode: string | null;
  flagUrl: string | null;
  continent: string | null;
  format: string;
  logoUrl: string | null;
}

export interface NavCountry {
  code: string | null;
  name: string | null;
  flagUrl: string | null;
  competitions: NavCompetition[];
}

export interface NavContinent {
  continent: Continent;
  label: string;
  /** Las copas de la confederación: van sueltas y arriba de los países. */
  competitions: NavCompetition[];
  countries: NavCountry[];
}

/*
 * Respaldo mínimo si el API no responde: el header no puede tirar una página abajo. No repite
 * el catálogo entero a propósito —sería una segunda fuente de verdad que envejece sola.
 */
const RESPALDO: NavContinent[] = [
  {
    continent: 'sudamerica',
    label: 'Sudamérica',
    competitions: [],
    countries: [
      {
        code: 'PE',
        name: 'Peru',
        flagUrl: null,
        competitions: [
          {
            id: '',
            name: 'Liga 1',
            slug: 'primera-division',
            country: 'Peru',
            countryCode: 'PE',
            flagUrl: null,
            continent: 'sudamerica',
            format: 'league',
            logoUrl: null,
          },
        ],
      },
    ],
  },
];

/* El catálogo cambia una vez por temporada y el API lo declara con s-maxage=3600. */
let ultimoBueno: NavContinent[] | null = null;

export async function getNavTree(): Promise<NavContinent[]> {
  try {
    const tree = await api<NavContinent[]>('/views/competitions');
    if (tree.length > 0) ultimoBueno = tree;
    return tree.length > 0 ? tree : (ultimoBueno ?? RESPALDO);
  } catch {
    return ultimoBueno ?? RESPALDO;
  }
}

/** Plano, para el pie y el buscador. */
export function todasLasCompetencias(tree: NavContinent[]): NavCompetition[] {
  return tree.flatMap((c) => [...c.competitions, ...c.countries.flatMap((p) => p.competitions)]);
}

/**
 * Las que van sueltas en la barra del header: lo que un hincha busca sin abrir el menú.
 * Con sesenta torneos, elegir por peso y no por orden alfabético es la diferencia entre una
 * barra útil y una lista arbitraria.
 */
const DESTACADAS = [
  'primera-division',
  'conmebol-libertadores',
  'uefa-champions-league',
  'premier-league',
];

export function destacadas(tree: NavContinent[], limite = 4): NavCompetition[] {
  const todas = todasLasCompetencias(tree);
  const elegidas = DESTACADAS.map((slug) => todas.find((c) => c.slug === slug)).filter(
    (c): c is NavCompetition => c !== undefined,
  );
  return [...elegidas, ...todas.filter((c) => !elegidas.includes(c))].slice(0, limite);
}
