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

export interface ApiFootballEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number };
  player: { id: number | null; name: string | null };
  assist: { id: number | null; name: string | null };
  type: 'Goal' | 'Card' | 'subst' | 'Var';
  detail: string;
  comments: string | null;
}
