import { Injectable } from '@nestjs/common';
import type {
  FootballDataProvider,
  ProviderCompetition,
  ProviderLineup,
  ProviderLiveMatch,
  ProviderMatch,
  ProviderMatchEvent,
  ProviderMatchPlayerStats,
  ProviderMatchStatistics,
  ProviderPlayer,
  ProviderSeasonPlayer,
  ProviderRef,
  ProviderStanding,
  ProviderTeam,
} from '@athena/domain';
import { ApiFootballClient } from './api-football.client.js';
import type {
  ApiFootballEvent,
  ApiFootballStandings,
  ApiFootballFixture,
  ApiFootballFixturePlayers,
  ApiFootballLeague,
  ApiFootballLineup,
  ApiFootballSeasonPlayer,
  ApiFootballSquad,
  ApiFootballStatistics,
  ApiFootballTeam,
} from './api-football.types.js';
import {
  mapEvents,
  mapFixture,
  mapFixturePlayers,
  mapLeague,
  mapLineup,
  mapSeasonPlayers,
  mapSquad,
  mapStandings,
  mapStatistics,
  mapTeam,
} from './mappers.js';

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

  /* El proveedor acepta hasta 20 ids por llamada, separados por guion. */
  async getMatchesByRefs(matchRefs: string[]): Promise<ProviderRef<ProviderMatch>[]> {
    const salida: ProviderRef<ProviderMatch>[] = [];
    for (let i = 0; i < matchRefs.length; i += 20) {
      const lote = matchRefs.slice(i, i + 20);
      const rows = await this.client.get<ApiFootballFixture>('/fixtures', { ids: lote.join('-') });
      salida.push(...rows.map(mapFixture));
    }
    return salida;
  }

  async getStandings(competitionRef: string, seasonYear: number): Promise<ProviderStanding[]> {
    const rows = await this.client.get<ApiFootballStandings>('/standings', {
      league: competitionRef,
      season: seasonYear,
    });
    return rows[0] ? mapStandings(rows[0]) : [];
  }

  async getLiveMatches(): Promise<ProviderLiveMatch[]> {
    const rows = await this.client.get<ApiFootballFixture>('/fixtures', { live: 'all' });
    return rows.map((row) => ({
      match: mapFixture(row),
      events: mapEvents(String(row.fixture.id), row.events ?? []),
    }));
  }

  async getMatchStatistics(matchRef: string): Promise<ProviderMatchStatistics[]> {
    const rows = await this.client.get<ApiFootballStatistics>('/fixtures/statistics', {
      fixture: matchRef,
    });
    return rows.map(mapStatistics);
  }

  async getMatchLineups(matchRef: string): Promise<ProviderLineup[]> {
    const rows = await this.client.get<ApiFootballLineup>('/fixtures/lineups', {
      fixture: matchRef,
    });
    return rows.map(mapLineup);
  }

  async getMatchPlayerStatistics(matchRef: string): Promise<ProviderMatchPlayerStats[]> {
    const rows = await this.client.get<ApiFootballFixturePlayers>('/fixtures/players', {
      fixture: matchRef,
    });
    return mapFixturePlayers(rows);
  }

  async getSeasonPlayers(
    competitionRef: string,
    seasonYear: number,
  ): Promise<ProviderSeasonPlayer[]> {
    const rows = await this.client.getAllPages<ApiFootballSeasonPlayer>('/players', {
      league: competitionRef,
      season: seasonYear,
    });
    return mapSeasonPlayers(rows, competitionRef, seasonYear);
  }

  async getMatchEvents(matchRef: string): Promise<ProviderMatchEvent[]> {
    const rows = await this.client.get<ApiFootballEvent>('/fixtures/events', {
      fixture: matchRef,
    });
    return mapEvents(matchRef, rows);
  }
}
