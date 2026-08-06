import { Injectable } from '@nestjs/common';
import type {
  FootballDataProvider,
  ProviderCompetition,
  ProviderMatch,
  ProviderMatchEvent,
  ProviderPlayer,
  ProviderRef,
  ProviderTeam,
} from '@athena/domain';
import { ApiFootballClient } from './api-football.client.js';
import type {
  ApiFootballEvent,
  ApiFootballFixture,
  ApiFootballLeague,
  ApiFootballSquad,
  ApiFootballTeam,
} from './api-football.types.js';
import { mapEvents, mapFixture, mapLeague, mapSquad, mapTeam } from './mappers.js';

@Injectable()
export class ApiFootballAdapter implements FootballDataProvider {
  readonly name = 'api-football';

  constructor(private readonly client: ApiFootballClient) {}

  async getCompetition(competitionRef: string): Promise<ProviderRef<ProviderCompetition> | null> {
    const rows = await this.client.get<ApiFootballLeague>('/leagues', { id: competitionRef });
    return rows[0] ? mapLeague(rows[0]) : null;
  }

  async getTeams(competitionRef: string, seasonYear: number): Promise<ProviderRef<ProviderTeam>[]> {
    const rows = await this.client.get<ApiFootballTeam>('/teams', {
      league: competitionRef,
      season: seasonYear,
    });
    return rows.map(mapTeam);
  }

  async getSquad(teamRef: string): Promise<ProviderRef<ProviderPlayer>[]> {
    const rows = await this.client.get<ApiFootballSquad>('/players/squads', { team: teamRef });
    return rows[0] ? mapSquad(rows[0]) : [];
  }

  async getMatches(
    competitionRef: string,
    seasonYear: number,
  ): Promise<ProviderRef<ProviderMatch>[]> {
    const rows = await this.client.get<ApiFootballFixture>('/fixtures', {
      league: competitionRef,
      season: seasonYear,
    });
    return rows.map(mapFixture);
  }

  async getLiveMatches(): Promise<ProviderRef<ProviderMatch>[]> {
    const rows = await this.client.get<ApiFootballFixture>('/fixtures', { live: 'all' });
    return rows.map(mapFixture);
  }

  async getMatchEvents(matchRef: string): Promise<ProviderMatchEvent[]> {
    const rows = await this.client.get<ApiFootballEvent>('/fixtures/events', {
      fixture: matchRef,
    });
    return mapEvents(matchRef, rows);
  }
}
