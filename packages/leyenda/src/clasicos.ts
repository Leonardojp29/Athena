/**
 * Los clásicos.
 *
 * El rival no se deduce de la tabla: se hereda. Sporting Cristal no es el clásico de Melgar por
 * tener una fuerza parecida, y el United no juega el derbi con el Sunderland por mucho que ese año
 * anden igual. Un clásico es historia, barrio y vecindad, y nada de eso está en una columna de la
 * base, así que se declara.
 *
 * Tres capas, en orden. Primero esta tabla, que cubre los derbis que cualquiera nombraría. Después
 * la ciudad —el proveedor sí trae el estadio de casi todos los clubes— porque dos equipos del mismo
 * barrio se odian aunque nadie lo haya escrito. Y de último recurso, el club más grande de la liga:
 * si vas a inventar un rival, que al menos sea uno que duela.
 */

/** Pares por slug. El orden no importa: se lee en los dos sentidos. */
const PAREJAS: Array<[string, string]> = [
  /* Perú */
  ['universitario', 'alianza-lima'],
  ['sporting-cristal', 'universitario'],
  ['sporting-cristal', 'alianza-lima'],
  ['melgar', 'cienciano'],
  ['universidad-cesar-vallejo', 'carlos-a-mannucci'],
  /* Argentina */
  ['boca-juniors', 'river-plate'],
  ['racing-club', 'independiente'],
  ['san-lorenzo', 'huracan'],
  ['rosario-central', 'newells-old-boys'],
  ['estudiantes-la-plata', 'gimnasia-la-plata'],
  ['velez-sarsfield', 'ferro-carril-oeste'],
  /* Brasil */
  ['flamengo', 'fluminense'],
  ['corinthians', 'palmeiras'],
  ['sao-paulo', 'corinthians'],
  ['santos', 'sao-paulo'],
  ['gremio', 'internacional'],
  ['atletico-mineiro', 'cruzeiro'],
  ['botafogo', 'vasco-da-gama'],
  /* Chile, Uruguay, Colombia, Ecuador, México */
  ['colo-colo', 'universidad-de-chile'],
  ['universidad-catolica', 'colo-colo'],
  ['penarol', 'nacional'],
  ['millonarios', 'independiente-santa-fe'],
  ['atletico-nacional', 'independiente-medellin'],
  ['america-de-cali', 'deportivo-cali'],
  ['barcelona-sc', 'emelec'],
  ['ldu-de-quito', 'aucas'],
  ['club-america', 'guadalajara-chivas'],
  ['club-america', 'cruz-azul'],
  ['pumas-unam', 'club-america'],
  ['monterrey', 'tigres-uanl'],
  /* Inglaterra */
  /* El derbi de la ciudad va primero cuando es el que la gente llama "el clásico" de ese club. */
  ['liverpool', 'everton'],
  ['manchester-united', 'liverpool'],
  ['manchester-united', 'manchester-city'],
  ['arsenal', 'tottenham'],
  ['chelsea', 'arsenal'],
  ['newcastle', 'sunderland'],
  ['aston-villa', 'birmingham-city'],
  ['west-ham', 'millwall'],
  /* España */
  ['real-madrid', 'barcelona'],
  ['real-madrid', 'atletico-madrid'],
  ['sevilla', 'real-betis'],
  ['athletic-club', 'real-sociedad'],
  ['valencia', 'levante'],
  ['celta-vigo', 'deportivo-la-coruna'],
  /* Italia */
  ['ac-milan', 'inter'],
  ['as-roma', 'lazio'],
  ['juventus', 'torino'],
  ['juventus', 'inter'],
  ['napoli', 'as-roma'],
  ['genoa', 'sampdoria'],
  /* Alemania */
  ['borussia-dortmund', 'schalke-04'],
  ['bayern-munchen', 'borussia-dortmund'],
  ['bayern-munchen', '1860-munich'],
  ['hamburger-sv', 'werder-bremen'],
  ['koln', 'borussia-monchengladbach'],
  /* Francia, Países Bajos, Portugal */
  ['paris-saint-germain', 'marseille'],
  ['lyon', 'saint-etienne'],
  ['lille', 'lens'],
  ['ajax', 'feyenoord'],
  ['psv-eindhoven', 'ajax'],
  ['benfica', 'porto'],
  ['benfica', 'sporting-cp'],
  ['porto', 'sporting-cp'],
  /* Estados Unidos y Canadá */
  ['la-galaxy', 'los-angeles-fc'],
  ['seattle-sounders', 'portland-timbers'],
  ['new-york-red-bulls', 'new-york-city-fc'],
];

const MAPA = new Map<string, string[]>();
for (const [uno, otro] of PAREJAS) {
  MAPA.set(uno, [...(MAPA.get(uno) ?? []), otro]);
  MAPA.set(otro, [...(MAPA.get(otro) ?? []), uno]);
}

/** Los rivales declarados de un club, si los tiene. */
export const rivalesDeclarados = (slug: string): string[] => MAPA.get(slug) ?? [];

/**
 * La ciudad, normalizada.
 *
 * El proveedor manda `Liverpool` para el Liverpool y `Liverpool, Merseyside` para el Everton, y
 * `Buenos Aires` para Boca contra `Capital Federal, Ciudad de Buenos Aires` para River. Sin esto,
 * los dos derbis más famosos del mundo no se detectarían.
 */
const ALIAS: Record<string, string> = {
  'capital federal': 'buenos aires',
  'ciudad de buenos aires': 'buenos aires',
  'ciudad autonoma de buenos aires': 'buenos aires',
  'ciudad de mexico': 'mexico df',
  'mexico city': 'mexico df',
  'distrito federal': 'mexico df',
};

export function normalizarCiudad(ciudad: string | null | undefined): string | null {
  if (!ciudad) return null;
  const base = ciudad
    .split(',')[0]
    ?.trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!base) return null;
  return ALIAS[base] ?? base;
}
