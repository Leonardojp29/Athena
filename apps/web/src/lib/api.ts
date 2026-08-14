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

/** Un goleador de la temporada, con lo que hizo sumado en toda la región. */
export interface Goleador {
  goals: number;
  assists: number;
  appearances: number;
  team_name: string;
  team_short: string | null;
  team_slug: string;
  team_logo: string | null;
  competition_name: string;
  competition_slug: string;
  competition_logo: string | null;
  player_id: string;
  player_name: string;
  player_slug: string;
  photo_url: string | null;
}

/** Los líderes de una región: goleadores de la temporada y lo mejor del último día jugado. */
export interface TopPerformers {
  continent: string;
  scorers: Goleador[];
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
  /** Goleadores y asistidores de la temporada, ya ordenados. */
  scorers: SeasonLeader[];
  assisters: SeasonLeader[];
  /** El equipo ideal de la última jornada con notas; null si todavía no alcanza para armarlo. */
  once: OnceDeLaFecha | null;
  /**
   * Las etapas de la copa en el orden en que se muestran: primero la que se está jugando. Vacío en
   * una liga, que no tiene más que su tabla.
   */
  etapas: FaseDeCopa[];
  /** Qué etapa se está jugando ahora; null en una liga o cuando la ronda no se reconoce. */
  etapaEnJuego: Etapa | null;
  /** La jornada en curso ya traducida: "Octavos de final", "Fase de grupos · fecha 6". */
  roundLabel: string | null;
  /** El once y el mejor de toda la temporada; null cuando no hay notas suficientes. */
  onceDelTorneo: OnceDelTorneo | null;
  /** Los años con partidos en la base, del más nuevo al más viejo: el archivo. */
  seasons: number[];
}

export interface EquipoDeCuadro {
  id: string;
  name: string;
  shortName: string | null;
  slug: string;
  logoUrl: string | null;
}

export interface PartidoDeCuadro {
  id: string;
  kickoffUtc: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
  round: string | null;
  homeTeam: EquipoDeCuadro;
  awayTeam: EquipoDeCuadro;
}

export interface LlaveDeCuadro {
  homeTeam: EquipoDeCuadro;
  awayTeam: EquipoDeCuadro;
  /** Ida y vuelta en orden de fecha; una sola cuando la llave es a partido único. */
  legs: PartidoDeCuadro[];
  /** El global de lo jugado, con el local del primer partido primero. */
  aggregate: { local: number; visita: number } | null;
  /** Se deduce de las rondas siguientes, así que resuelve también las llaves definidas por penales. */
  advancedTeamId: string | null;
}

export interface RondaDeCuadro {
  round: string;
  label: string;
  ties: LlaveDeCuadro[];
  /** Cuántas llaves va a tener cuando se defina; solo en las rondas que todavía no se sortearon. */
  porDefinir?: number;
}

/** Las tres etapas de una copa: la fase final, la fase de grupos y la previa. */
export type Etapa = 'final' | 'grupos' | 'previa';

export interface FaseDeCopa {
  etapa: Etapa;
  enJuego: boolean;
  /** Las rondas del cuadro; vacío en la fase de grupos, que se dibuja con sus tablas. */
  rondas: RondaDeCuadro[];
}

/** Una fila del once del torneo: viene de SQL con los puestos que usa el proveedor. */
export interface JugadorDelOnceDelTorneo {
  position: string;
  rating: string | null;
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  player_id: string;
  player_name: string;
  player_slug: string;
  photo_url: string | null;
  team_name: string;
  team_short: string | null;
  team_slug: string;
  team_logo: string | null;
}

export interface OnceDelTorneo {
  players: JugadorDelOnceDelTorneo[];
  best: JugadorDelOnceDelTorneo | null;
}

/** Una fila del once: viene de SQL, así que las claves son las de la base. */
export interface JugadorDelOnce {
  position: string;
  rating: string | null;
  goals: number | null;
  assists: number | null;
  minutes_played: number | null;
  shirt_number: number | null;
  saves: number | null;
  shots_total: number | null;
  shots_on_target: number | null;
  passes_total: number | null;
  passes_key: number | null;
  passes_accurate: number | null;
  tackles_total: number | null;
  interceptions: number | null;
  duels_total: number | null;
  duels_won: number | null;
  dribbles_total: number | null;
  dribbles_success: number | null;
  fouls_committed: number | null;
  fouls_drawn: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  penalty_scored: number | null;
  penalty_missed: number | null;
  penalty_saved: number | null;
  player_id: string;
  player_name: string;
  player_slug: string;
  photo_url: string | null;
  team_name: string;
  team_short: string | null;
  team_slug: string;
  team_logo: string | null;
  match_id: string;
  round: string;
}

export interface OnceDeLaFecha {
  round: string | null;
  players: JugadorDelOnce[];
}

export interface SeasonLeader {
  goals: number | null;
  assists: number | null;
  appearances: number | null;
  minutesPlayed: number | null;
  player: PlayerLink;
  team: TeamSummary;
}

export interface SquadPlayer {
  shirtNumber: number | null;
  position: string | null;
  player: PlayerLink & { position: string | null };
}

/**
 * Un cambio, ya normalizado por el API.
 *
 * El proveedor pone al que sale en `player` y al que entra en `relatedPlayer`; acá los nombres dicen
 * lo que son. Un tercio de los eventos no tiene el jugador resuelto en Athena, así que además del
 * enlace viaja el nombre suelto como respaldo.
 */
export interface Cambio {
  minute: number;
  extraMinute: number | null;
  sale: PlayerLink | null;
  saleNombre: string | null;
  entra: PlayerLink | null;
  entraNombre: string | null;
}

/** Una alineación con su banco, sus cambios y las notas de ese partido. */
export interface UltimaAlineacion {
  match: MatchCard;
  formation: string | null;
  coachName: string | null;
  startXi: LineupPlayer[];
  substitutes: LineupPlayer[];
  substitutions: Cambio[];
  stats: Array<MatchPlayerStats & { matchId: string }>;
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
    /** Hex sin almohadilla, como los publica el proveedor en las alineaciones. */
    primaryColor: string | null;
    secondaryColor: string | null;
  };
  squad: { year: number | null; lines: Array<{ line: string; label: string; players: SquadPlayer[] }> };
  /** Los goleadores del club en la temporada: quiénes juegan, no solo quiénes están. */
  scorers: Array<SeasonLeader & { rating: string | null; season: { year: number; competition: { name: string; slug: string } } }>;
  /** Con la fase en juego primero: un equipo puede tener el Apertura cerrado y el Clausura en curso. */
  standings: Array<
    Omit<StandingRow, 'team'> & {
      current: boolean;
      season: { year: number; competition: { name: string; slug: string; logoUrl: string | null } };
    }
  >;
  recent: MatchCard[];
  upcoming: MatchCard[];
  /** Con qué salió en sus últimos partidos, del más reciente al más viejo; vacío si no hay ninguna. */
  lineups: UltimaAlineacion[];
}

/** El historial entre los dos equipos: el resumen de siempre y los últimos cruces. */
export interface CruceHistorial {
  id: string;
  kickoff_utc: string;
  home_score: number | null;
  away_score: number | null;
  home_name: string;
  home_short: string | null;
  home_slug: string;
  home_logo: string | null;
  away_name: string;
  away_short: string | null;
  away_slug: string;
  away_logo: string | null;
  competition_name: string;
  competition_slug: string;
}

export interface Historial {
  resumen: {
    jugados: number;
    gano_local: number;
    empates: number;
    gano_visita: number;
    goles_local: number;
    goles_visita: number;
  } | null;
  ultimos: CruceHistorial[];
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
  historial: Historial;
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
