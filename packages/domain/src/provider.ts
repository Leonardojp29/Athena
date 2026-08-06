import type { Competition, Match, MatchEvent, Player, Season, Team } from './entities.js';

/**
 * Port for external football data providers (hexagonal architecture).
 * API-Football is the first implementation; the domain only knows this contract.
 *
 * Adapters return domain shapes plus the provider's stable reference so the
 * sync layer can maintain the external_references mapping.
 */
export interface ProviderRef<T> {
  data: T;
  providerRef: string;
}

export interface FootballDataProvider {
  readonly name: string;

  getCompetitions(): Promise<ProviderRef<Competition>[]>;
  getSeasons(competitionRef: string): Promise<ProviderRef<Season>[]>;
  getTeams(competitionRef: string, seasonYear: number): Promise<ProviderRef<Team>[]>;
  getSquad(teamRef: string): Promise<ProviderRef<Player>[]>;
  getMatches(competitionRef: string, seasonYear: number): Promise<ProviderRef<Match>[]>;
  getLiveMatches(): Promise<ProviderRef<Match>[]>;
  getMatchEvents(matchRef: string): Promise<ProviderRef<MatchEvent>[]>;
}
