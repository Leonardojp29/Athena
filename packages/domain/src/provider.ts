import type { CompetitionFormat, MatchEventKind, MatchStatus, PlayerPosition } from './entities.js';

// Puerto hexagonal para proveedores de datos. Los DTOs no llevan UUIDs de Athena:
// la capa de sync los resuelve vía external_references. Referencias entre
// entidades viajan como providerRef.

export interface ProviderRef<T> {
  providerRef: string;
  data: T;
}

export interface ProviderSeason {
  year: number;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export interface ProviderCompetition {
  name: string;
  country: string | null;
  format: CompetitionFormat;
  logoUrl: string | null;
  seasons: ProviderSeason[];
}

export interface ProviderTeam {
  name: string;
  shortName: string | null;
  country: string | null;
  founded: number | null;
  isNationalTeam: boolean;
  logoUrl: string | null;
}

export interface ProviderPlayer {
  name: string;
  fullName: string | null;
  birthDate: string | null;
  nationality: string | null;
  heightCm: number | null;
  position: PlayerPosition | null;
  photoUrl: string | null;
}

export interface ProviderMatch {
  competitionRef: string;
  seasonYear: number;
  round: string | null;
  homeTeamRef: string;
  awayTeamRef: string;
  kickoffUtc: string;
  status: MatchStatus;
  statusDetail: string | null;
  elapsedMinutes: number | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface ProviderMatchEvent {
  matchRef: string;
  kind: MatchEventKind;
  minute: number;
  extraMinute: number | null;
  teamRef: string;
  playerRef: string | null;
  relatedPlayerRef: string | null;
  detail: Record<string, unknown> | null;
}

export interface ProviderStanding {
  teamRef: string;
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
}

export interface FootballDataProvider {
  readonly name: string;

  getCompetition(competitionRef: string): Promise<ProviderRef<ProviderCompetition> | null>;
  getTeams(competitionRef: string, seasonYear: number): Promise<ProviderRef<ProviderTeam>[]>;
  getSquad(teamRef: string): Promise<ProviderRef<ProviderPlayer>[]>;
  getMatches(competitionRef: string, seasonYear: number): Promise<ProviderRef<ProviderMatch>[]>;
  getStandings(competitionRef: string, seasonYear: number): Promise<ProviderStanding[]>;
  getLiveMatches(): Promise<ProviderRef<ProviderMatch>[]>;
  getMatchEvents(matchRef: string): Promise<ProviderMatchEvent[]>;
}
