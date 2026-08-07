const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/*
 * Caché de respuestas del API, en el proceso del servidor de la web.
 *
 * Medido antes de escribirla: cada navegación tardaba entre 7 y 9 segundos porque cada página
 * rearmaba las mismas vistas y cada vista viaja a Supabase, que está fuera de la región. El API
 * ya declara cuánto vale cada respuesta en su `Cache-Control: s-maxage`; nadie lo estaba
 * honrando. Esto lo honra.
 *
 * Solo se cachea lo público —lo que va sin token—: `/me/*` lleva Authorization y nunca entra
 * acá. Un caché compartido entre visitantes con datos de sesión sería una filtración, no una
 * optimización.
 *
 * Y se guarda la promesa, no el valor: dos componentes que piden lo mismo en el mismo render
 * comparten una sola llamada en vuelo en lugar de disparar dos.
 */
interface Entrada {
  vence: number;
  promesa: Promise<unknown>;
}

const cache = new Map<string, Entrada>();
const TTL_POR_DEFECTO_MS = 30_000;
const MAX_ENTRADAS = 300;

/** Lee el s-maxage que el propio API declara; si no dice nada, 30 segundos. */
function ttlDe(res: Response): number {
  const header = res.headers.get('cache-control') ?? '';
  const match = /s-maxage=(\d+)/.exec(header);
  return match?.[1] ? Number(match[1]) * 1000 : TTL_POR_DEFECTO_MS;
}

export async function api<T>(path: string, accessToken?: string | null): Promise<T> {
  if (accessToken) return pedir<T>(path, accessToken);

  const ahora = Date.now();
  const guardada = cache.get(path);
  if (guardada && guardada.vence > ahora) return guardada.promesa as Promise<T>;

  /* Vence al TTL por defecto y se corrige con el del API en cuanto llega la respuesta. */
  const entrada: Entrada = {
    vence: ahora + TTL_POR_DEFECTO_MS,
    promesa: pedir<T>(path, null, (res) => {
      entrada.vence = Date.now() + ttlDe(res);
    }),
  };
  /* Una petición que falla no se queda cacheada: el próximo render vuelve a intentar. */
  entrada.promesa.catch(() => cache.delete(path));

  if (cache.size >= MAX_ENTRADAS) cache.clear();
  cache.set(path, entrada);
  return entrada.promesa as Promise<T>;
}

async function pedir<T>(
  path: string,
  accessToken: string | null,
  alResponder?: (res: Response) => void,
): Promise<T> {
  const res = await fetch(`${API_URL}/v1${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
  alResponder?.(res);
  if (!res.ok) throw new ApiError(res.status, `${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface FavoriteEntity {
  entityType: 'team' | 'competition' | 'player';
  entityId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

export interface PersonalFeed {
  hasFavorites: boolean;
  live: MatchCard[];
  upcoming: MatchCard[];
  recent: MatchCard[];
  insights: Array<{ matchId: string; titular: string }>;
}

export interface TeamSummary {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  logoUrl: string | null;
}

export interface MatchCard {
  id: string;
  kickoffUtc: string;
  status: string;
  statusDetail: string | null;
  elapsedMinutes: number | null;
  round: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homeTeam: TeamSummary;
  awayTeam: TeamSummary;
  season: {
    year: number;
    competition: {
      id: string;
      name: string;
      slug: string;
      logoUrl: string | null;
      country: string | null;
      countryCode: string | null;
      flagUrl: string | null;
      continent: string | null;
      format: string;
    };
  };
}

export interface StandingRow {
  groupLabel: string;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  form: string | null;
  team: TeamSummary;
}

export interface MatchSection {
  competition: MatchCard['season']['competition'];
  matches: MatchCard[];
}

/* El mismo árbol que la navegación: continente → país → torneo → partidos. */
export interface GeographyCountry {
  code: string | null;
  name: string | null;
  flagUrl: string | null;
  competitions: MatchSection[];
}

export interface GeographyContinent {
  continent: string;
  label: string;
  countries: GeographyCountry[];
}

export interface HomeView {
  live: number;
  sections: MatchSection[];
  geography: GeographyContinent[];
}

export interface MatchDayView {
  date: string;
  total: number;
  live: number;
  sections: MatchSection[];
  geography: GeographyContinent[];
}

/** El mejor rendimiento de un día: sale de nuestra base, no del proveedor. */
export interface TopPerformer {
  rating: string | null;
  minutesPlayed: number | null;
  goals: number | null;
  assists: number | null;
  penaltyScored: number | null;
  player: PlayerLink;
  team: TeamSummary;
  match: {
    id: string;
    homeScore: number | null;
    awayScore: number | null;
    homeTeam: TeamSummary;
    awayTeam: TeamSummary;
    season: { competition: { name: string; slug: string } };
  };
}

/** El podio y de qué día es: a media mañana todavía no terminó ningún partido de hoy. */
export interface TopPerformers {
  date: string;
  esDeHoy: boolean;
  players: TopPerformer[];
}

export interface CompetitionView {
  competition: {
    id: string;
    name: string;
    slug: string;
    country: string | null;
    countryCode: string | null;
    flagUrl: string | null;
    format: string;
    logoUrl: string | null;
  };
  season: { year: number };
  /** Jornada en curso, tal como la nombra el proveedor: "Clausura - 4". */
  round: string | null;
  /**
   * Las tablas de la temporada, con la fase en juego primero. `current` es falso en todas cuando
   * los grupos son simultáneos —una copa, las conferencias de la MLS—: ahí no hay nada que
   * priorizar y se muestran juntas.
   */
  standingGroups: Array<{ label: string; rows: StandingRow[]; current: boolean }>;
  recent: MatchCard[];
  upcoming: MatchCard[];
}

export interface SquadPlayer {
  shirtNumber: number | null;
  position: string | null;
  player: PlayerLink & { position: string | null };
}

export interface TeamView {
  team: {
    id: string;
    name: string;
    shortName: string | null;
    slug: string;
    country: string | null;
    founded: number | null;
    logoUrl: string | null;
  };
  squad: { year: number | null; lines: Array<{ line: string; label: string; players: SquadPlayer[] }> };
  /** Con la fase en juego primero: un equipo puede tener el Apertura cerrado y el Clausura en curso. */
  standings: Array<
    Omit<StandingRow, 'team'> & {
      current: boolean;
      season: { year: number; competition: { name: string; slug: string; logoUrl: string | null } };
    }
  >;
  recent: MatchCard[];
  upcoming: MatchCard[];
}

export interface MatchEventView {
  id: string;
  kind: string;
  minute: number;
  extraMinute: number | null;
  detail: {
    label?: string;
    comments?: string | null;
    playerName?: string | null;
    relatedPlayerName?: string | null;
  } | null;
  team: { id: string };
  player: PlayerLink | null;
  relatedPlayer: PlayerLink | null;
}

/** Hechos que respaldan una narrativa; el fact sheet que armó el worker. */
export interface MatchEvidence {
  partido?: {
    competencia: string;
    temporada: number;
    jornada: string | null;
    fecha: string;
    estado: string;
    local: string;
    visitante: string;
    golesLocal: number | null;
    golesVisitante: number | null;
    resultado: string;
  };
  eventos?: Array<{
    minuto: string;
    tipo: string;
    equipo: string;
    jugador: string | null;
    asistencia: string | null;
  }>;
  tabla?: Array<{
    equipo: string;
    posicion: number;
    puntos: number;
    jugados: number;
    diferenciaGoles: number;
  }>;
  historial?: Array<{ fecha: string; local: string; marcador: string; visitante: string }>;
  forma?: Array<{ equipo: string; orden?: string; ultimosCinco: string; detalle: string[] }>;
}

export interface MatchInsight {
  titular: string;
  analisis: string;
  claves: string[];
  model: string;
  promptVersion: string;
  generatedAt: string;
  evidence: MatchEvidence;
}

export interface MatchPreviewInsight {
  titular: string;
  previa: string;
  aSeguir: string[];
  model: string;
  promptVersion: string;
  generatedAt: string;
  evidence: MatchEvidence;
}

export interface TeamStatistics {
  teamId: string;
  possessionPercent: number | null;
  shotsTotal: number | null;
  shotsOnGoal: number | null;
  shotsOffGoal: number | null;
  corners: number | null;
  offsides: number | null;
  fouls: number | null;
  yellowCards: number | null;
  redCards: number | null;
  goalkeeperSaves: number | null;
  passesTotal: number | null;
  passesAccurate: number | null;
  passesPercent: number | null;
}

export interface PlayerLink {
  id: string;
  name: string;
  slug: string;
  photoUrl: string | null;
}

/** El slug y la foto están denormalizados en el JSONB: dibujar la cancha no cuesta un join. */
export interface LineupPlayer {
  playerId: string | null;
  slug: string | null;
  photoUrl: string | null;
  name: string;
  number: number | null;
  position: string | null;
  grid: string | null;
}

export interface MatchPlayerStats {
  teamId: string;
  player: PlayerLink;
  shirtNumber: number | null;
  position: string | null;
  isStarter: boolean;
  minutesPlayed: number | null;
  rating: string | null;
  captain: boolean;
  goals: number | null;
  goalsConceded: number | null;
  assists: number | null;
  saves: number | null;
  shotsTotal: number | null;
  shotsOnTarget: number | null;
  passesTotal: number | null;
  passesKey: number | null;
  passesAccurate: number | null;
  tacklesTotal: number | null;
  interceptions: number | null;
  duelsTotal: number | null;
  duelsWon: number | null;
  dribblesTotal: number | null;
  dribblesSuccess: number | null;
  foulsCommitted: number | null;
  foulsDrawn: number | null;
  yellowCards: number | null;
  redCards: number | null;
  penaltyScored: number | null;
  penaltyMissed: number | null;
  penaltySaved: number | null;
}

export interface VenueSummary {
  id: string;
  name: string;
  city: string | null;
  capacity: number | null;
}

export interface TeamLineup {
  teamId: string;
  formation: string | null;
  coachName: string | null;
  startXi: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export type MatchView = MatchCard & {
  venue: VenueSummary | null;
  events: MatchEventView[];
  insight: MatchInsight | null;
  preview: MatchPreviewInsight | null;
  statistics: TeamStatistics[];
  lineups: TeamLineup[];
  playerStatistics: MatchPlayerStats[];
};

/** Filas de la comparación de estadísticas, en el orden en que se muestran. */
export const STAT_ROWS: Array<{ key: keyof TeamStatistics; label: string; isPercent?: boolean }> = [
  { key: 'possessionPercent', label: 'Posesión', isPercent: true },
  { key: 'shotsTotal', label: 'Remates' },
  { key: 'shotsOnGoal', label: 'Remates al arco' },
  { key: 'corners', label: 'Córners' },
  { key: 'fouls', label: 'Faltas' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'goalkeeperSaves', label: 'Atajadas' },
  { key: 'passesAccurate', label: 'Pases precisos' },
  { key: 'passesPercent', label: 'Precisión de pases', isPercent: true },
];

export interface SearchHit {
  type: 'team' | 'player' | 'competition';
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  subtitle: string | null;
  score: number;
  matchedBy: 'nombre' | 'semántica';
}

export interface PlayerView {
  player: {
    id: string;
    name: string;
    fullName: string | null;
    slug: string;
    position: string | null;
    nationality: string | null;
    birthDate: string | null;
    heightCm: number | null;
    photoUrl: string | null;
  };
  teams: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    country: string | null;
  }>;
  events: Array<{
    kind: string;
    minute: number;
    match: {
      id: string;
      kickoffUtc: string;
      homeScore: number | null;
      awayScore: number | null;
      homeTeam: { name: string };
      awayTeam: { name: string };
      season: { competition: { name: string } };
    };
  }>;
  seasons: Array<{
    appearances: number | null;
    lineups: number | null;
    minutesPlayed: number | null;
    rating: string | null;
    goals: number | null;
    assists: number | null;
    shotsTotal: number | null;
    shotsOnTarget: number | null;
    passesTotal: number | null;
    passesKey: number | null;
    passesAccuracyPercent: number | null;
    duelsWon: number | null;
    dribblesSuccess: number | null;
    yellowCards: number | null;
    redCards: number | null;
    penaltyScored: number | null;
    team: TeamSummary;
    season: { year: number; competition: { name: string; slug: string; logoUrl: string | null } };
  }>;
  totals: {
    appearances: number;
    minutesPlayed: number;
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
  } | null;
  recentPerformances: Array<
    Omit<MatchPlayerStats, 'player'> & {
      match: {
        id: string;
        kickoffUtc: string;
        homeScore: number | null;
        awayScore: number | null;
        homeTeam: TeamSummary;
        awayTeam: TeamSummary;
        season: { competition: { name: string; slug: string } };
      };
    }
  >;
  shirtNumber: number | null;
  squad: Array<{ year: number; shirtNumber: number | null; team: TeamSummary }>;
}

export const PATH_BY_TYPE: Record<SearchHit['type'], string> = {
  team: '/equipos',
  player: '/jugadores',
  competition: '/competencias',
};

export const POSITION_LABEL: Record<string, string> = {
  goalkeeper: 'Arquero',
  defender: 'Defensor',
  midfielder: 'Mediocampista',
  attacker: 'Delantero',
};
