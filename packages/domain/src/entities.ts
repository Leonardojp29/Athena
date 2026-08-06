/**
 * Athena domain model — first cut (Fase 0).
 *
 * These types belong to Athena, never to a data provider. Provider adapters
 * translate external payloads into these shapes at the boundary and nothing
 * provider-specific crosses it (see docs/decisions/ADR-001).
 */

export type EntityId = string; // UUID v7

export type EntityType =
  | 'player'
  | 'team'
  | 'competition'
  | 'season'
  | 'match'
  | 'venue'
  | 'coach';

export interface Player {
  id: EntityId;
  name: string;
  fullName: string | null;
  slug: string;
  birthDate: string | null; // ISO date
  nationality: string | null;
  heightCm: number | null;
  position: PlayerPosition | null;
  photoUrl: string | null;
}

export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'attacker';

export interface Team {
  id: EntityId;
  name: string;
  shortName: string | null;
  slug: string;
  country: string | null;
  founded: number | null;
  isNationalTeam: boolean;
  logoUrl: string | null;
  venueId: EntityId | null;
}

export type CompetitionFormat = 'league' | 'cup';

export interface Competition {
  id: EntityId;
  name: string;
  slug: string;
  country: string | null;
  format: CompetitionFormat;
  logoUrl: string | null;
}

export interface Season {
  id: EntityId;
  competitionId: EntityId;
  /** Start year, e.g. 2025 for the 2025-26 season. Matches provider convention. */
  year: number;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
}

export type MatchStatus =
  | 'scheduled'
  | 'in_play'
  | 'paused'
  | 'finished'
  | 'postponed'
  | 'suspended'
  | 'cancelled'
  | 'abandoned'
  | 'awarded';

export interface Match {
  id: EntityId;
  seasonId: EntityId;
  round: string | null;
  homeTeamId: EntityId;
  awayTeamId: EntityId;
  kickoffUtc: string; // ISO datetime, always UTC
  status: MatchStatus;
  /** Provider-granular status (1H, HT, ET, PEN...) preserved for the Match Center. */
  statusDetail: string | null;
  elapsedMinutes: number | null;
  homeScore: number | null;
  awayScore: number | null;
  venueId: EntityId | null;
}

export type MatchEventKind =
  | 'goal'
  | 'own_goal'
  | 'penalty_goal'
  | 'missed_penalty'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'var';

export interface MatchEvent {
  id: EntityId;
  matchId: EntityId;
  kind: MatchEventKind;
  minute: number;
  extraMinute: number | null;
  teamId: EntityId;
  playerId: EntityId | null;
  relatedPlayerId: EntityId | null; // assist, player subbed off, etc.
  detail: Record<string, unknown> | null;
}

/**
 * Append-only log of meaningful football happenings (transfers, records,
 * manager changes...). Powers timelines, analytics and AI reasoning.
 */
export interface DomainEvent {
  id: EntityId;
  kind: string; // e.g. 'MATCH_FINISHED', 'PLAYER_TRANSFER'
  subjectType: EntityType;
  subjectId: EntityId;
  occurredAt: string; // ISO datetime UTC
  payload: Record<string, unknown>;
}

export interface Insight {
  id: EntityId;
  subjectType: EntityType;
  subjectId: EntityId;
  kind: string; // e.g. 'match_preview', 'post_match_analysis'
  narrative: string;
  /** Facts the narrative was generated from. A narrative is never shown without evidence. */
  evidence: Record<string, unknown>;
  model: string;
  promptVersion: string;
  lang: string;
  generatedAt: string;
  expiresAt: string | null;
}
