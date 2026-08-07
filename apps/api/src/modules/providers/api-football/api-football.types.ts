// Formas crudas del API-Football v3. Estos tipos no salen de este directorio.

export interface ApiFootballEnvelope<T> {
  get: string;
  parameters: Record<string, string>;
  errors: unknown[] | Record<string, string>;
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

export interface ApiFootballLeague {
  league: { id: number; name: string; type: 'League' | 'Cup'; logo: string | null };
  country: { name: string; code: string | null; flag: string | null };
  seasons: Array<{
    year: number;
    start: string;
    end: string;
    current: boolean;
  }>;
}

export interface ApiFootballVenue {
  id: number | null;
  name: string | null;
  city: string | null;
  capacity?: number | null;
  country?: string | null;
}

export interface ApiFootballTeam {
  team: {
    id: number;
    name: string;
    code: string | null;
    country: string | null;
    founded: number | null;
    national: boolean;
    logo: string | null;
  };
  venue?: ApiFootballVenue;
}

export interface ApiFootballSquad {
  team: { id: number };
  players: Array<{
    id: number;
    name: string;
    age: number | null;
    number: number | null;
    position: 'Goalkeeper' | 'Defender' | 'Midfielder' | 'Attacker' | null;
    photo: string | null;
  }>;
}

export interface ApiFootballFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; long: string; elapsed: number | null };
    venue?: ApiFootballVenue;
  };
  league: { id: number; season: number; round: string | null };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: { home: number | null; away: number | null };
  // presente solo en fixtures?live=*
  events?: ApiFootballEvent[];
}

export interface ApiFootballStandings {
  league: {
    id: number;
    season: number;
    standings: Array<
      Array<{
        rank: number;
        team: { id: number; name: string };
        points: number;
        group: string | null;
        form: string | null;
        all: {
          played: number;
          win: number;
          draw: number;
          lose: number;
          goals: { for: number; against: number };
        };
      }>
    >;
  };
}

export interface ApiFootballStatistics {
  team: { id: number };
  /* Mismo caso que las alineaciones: en algunos partidos la clave no viene. */
  statistics?: Array<{ type: string; value: string | number | null }>;
}

/*
 * `startXI` y `substitutes` **faltan**, no vienen vacíos, en los partidos sin alineación
 * publicada: el proveedor devuelve solo equipo, técnico y formación. Verificado contra el
 * fixture 1515157, que hacía estallar el backfill con "undefined is not a map".
 */
export interface ApiFootballLineup {
  team: {
    id: number;
    /* `player.primary` es el color de la camiseta y `player.number` el del dorsal, que hace de secundario. */
    colors?: {
      player?: { primary?: string | null; number?: string | null } | null;
    } | null;
  };
  formation: string | null;
  coach: { id: number | null; name: string | null };
  startXI?: Array<{
    player: {
      id: number | null;
      name: string;
      number: number | null;
      pos: string | null;
      grid: string | null;
    };
  }>;
  substitutes?: Array<{
    player: {
      id: number | null;
      name: string;
      number: number | null;
      pos: string | null;
      grid: string | null;
    };
  }>;
}

export interface ApiFootballEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: 'Goal' | 'Card' | 'subst' | 'Var';
  detail: string;
  comments: string | null;
}

/** Bloque de estadísticas por jugador; se repite igual en /fixtures/players y /players. */
interface ApiFootballPlayerStatBlock {
  team?: { id: number; name?: string; logo?: string | null };
  league?: { id: number; season: number };
  games?: {
    appearences?: number | null;
    lineups?: number | null;
    minutes: number | null;
    number: number | null;
    position: string | null;
    rating: string | null;
    captain: boolean | null;
    substitute?: boolean | null;
  };
  offsides?: number | null;
  shots?: { total: number | null; on: number | null };
  goals?: {
    total: number | null;
    conceded: number | null;
    assists: number | null;
    saves: number | null;
  };
  passes?: { total: number | null; key: number | null; accuracy: number | string | null };
  tackles?: { total: number | null; blocks: number | null; interceptions: number | null };
  duels?: { total: number | null; won: number | null };
  dribbles?: { attempts: number | null; success: number | null; past: number | null };
  fouls?: { drawn: number | null; committed: number | null };
  cards?: { yellow: number | null; yellowred?: number | null; red: number | null };
  penalty?: {
    won: number | null;
    commited: number | null;
    scored: number | null;
    missed: number | null;
    saved: number | null;
  };
}

export interface ApiFootballFixturePlayers {
  team: { id: number };
  players: Array<{
    player: { id: number | null; name: string; photo: string | null };
    statistics: ApiFootballPlayerStatBlock[];
  }>;
}

export interface ApiFootballSeasonPlayer {
  player: {
    id: number;
    name: string;
    firstname: string | null;
    lastname: string | null;
    birth?: { date: string | null };
    nationality: string | null;
    height: string | null;
    photo: string | null;
  };
  statistics: ApiFootballPlayerStatBlock[];
}
