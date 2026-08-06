const API_URL = import.meta.env.PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, accessToken?: string | null): Promise<T> {
  const res = await fetch(`${API_URL}/v1${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  });
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
    competition: { id: string; name: string; slug: string; logoUrl: string | null };
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

export interface HomeView {
  live: number;
  sections: Array<{ competition: MatchCard['season']['competition']; matches: MatchCard[] }>;
}

export interface CompetitionView {
  competition: {
    id: string;
    name: string;
    slug: string;
    country: string | null;
    format: string;
    logoUrl: string | null;
  };
  season: { year: number };
  standingGroups: Array<{ label: string; rows: StandingRow[] }>;
  recent: MatchCard[];
  upcoming: MatchCard[];
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
  standings: Array<
    Omit<StandingRow, 'team'> & {
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
  player: { name: string } | null;
  relatedPlayer: { name: string } | null;
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

export interface LineupPlayer {
  playerId: string | null;
  name: string;
  number: number | null;
  position: string | null;
  grid: string | null;
}

export interface TeamLineup {
  teamId: string;
  formation: string | null;
  coachName: string | null;
  startXi: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export type MatchView = MatchCard & {
  events: MatchEventView[];
  insight: MatchInsight | null;
  preview: MatchPreviewInsight | null;
  statistics: TeamStatistics[];
  lineups: TeamLineup[];
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
