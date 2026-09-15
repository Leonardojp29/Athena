import { Injectable } from '@nestjs/common';
import type {
  FootballDataProvider,
  ProviderCompetition,
  ProviderLineup,
  ProviderLiveMatch,
  ProviderMatch,
  ProviderMatchDetail,
  ProviderMatchEvent,
  ProviderMatchPlayerStats,
  ProviderMatchStatistics,
  ProviderPlayer,
  ProviderSeasonPlayer,
  ProviderRef,
  ProviderStanding,
  ProviderTeam,
  ProviderTransfer,
  ProviderTrophy,
} from '@athena/domain';
import { ApiFootballClient } from './api-football.client.js';
import type {
  ApiFootballPlayerProfile,
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
  ApiFootballTransfers,
  ApiFootballTrophy,
} from './api-football.types.js';
import {
  mapPlayerProfile,
  mapEvents,
  mapFixture,
  mapFixtureDetail,
  mapFixturePlayers,
  mapLeague,
  mapLineup,
  mapSeasonPlayers,
  mapSquad,
  mapStandings,
  mapStatistics,
  mapTeam,
  mapTransfers,
  mapTrophies,
} from './mappers.js';

/** El proveedor acepta hasta veinte ids por llamada, separados por guion. */
const MAXIMO_POR_LOTE = 20;

function* enLotes<T>(items: T[], tamano: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += tamano) yield items.slice(i, i + tamano);
}

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

  async searchPlayers(texto: string): Promise<ProviderRef<ProviderPlayer>[]> {
    const rows = await this.client.get<ApiFootballPlayerProfile>('/players/profiles', {
      search: texto,
    });
    return rows.map(mapPlayerProfile);
  }

  async getTeamSeasonPlayers(
    teamRef: string,
    seasonYear: number,
    competitionRef?: string,
  ): Promise<ProviderRef<ProviderPlayer>[]> {
    const rows = await this.client.getAllPages<ApiFootballSeasonPlayer>('/players', {
      team: teamRef,
      season: seasonYear,
      ...(competitionRef ? { league: competitionRef } : {}),
    });
    return rows.map((raw) => ({
      providerRef: String(raw.player.id),
      data: {
        name: raw.player.name,
        fullName: [raw.player.firstname, raw.player.lastname].filter(Boolean).join(' ') || null,
        birthDate: raw.player.birth?.date ?? null,
        nationality: raw.player.nationality,
        heightCm: null,
        position: null,
        photoUrl: raw.player.photo,
      },
    }));
  }

  /**
   * `/players/profiles` acepta un solo jugador por pedido, así que se piden en serie. Es un camino
   * de relleno —futbolistas retirados que ya no están en ninguna plantilla— y no de operación.
   */
  async getPlayerProfiles(playerRefs: string[]): Promise<ProviderRef<ProviderPlayer>[]> {
    const fichas: ProviderRef<ProviderPlayer>[] = [];
    for (const ref of playerRefs) {
      const rows = await this.client.get<ApiFootballPlayerProfile>('/players/profiles', {
        player: ref,
      });
      if (rows[0]) fichas.push(mapPlayerProfile(rows[0]));
    }
    return fichas;
  }

  async getTrophies(playerRef: string): Promise<ProviderTrophy[]> {
    const rows = await this.client.get<ApiFootballTrophy>('/trophies', { player: playerRef });
    return mapTrophies(playerRef, rows);
  }

  async getTransfers(teamRef: string): Promise<ProviderTransfer[]> {
    const rows = await this.client.get<ApiFootballTransfers>('/transfers', { team: teamRef });
    return mapTransfers(rows);
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

  async getMatchesByRefs(matchRefs: string[]): Promise<ProviderRef<ProviderMatch>[]> {
    const salida: ProviderRef<ProviderMatch>[] = [];
    for (const lote of enLotes(matchRefs, MAXIMO_POR_LOTE)) {
      const rows = await this.client.get<ApiFootballFixture>('/fixtures', { ids: lote.join('-') });
      salida.push(...rows.map(mapFixture));
    }
    return salida;
  }

  /*
   * Pedir por `ids` trae el partido con sus eventos, alineaciones, estadísticas y notas embebidos:
   * veinte partidos cerrados con un request en lugar de sesenta.
   */
  async getMatchDetails(matchRefs: string[]): Promise<ProviderMatchDetail[]> {
    const salida: ProviderMatchDetail[] = [];
    for (const lote of enLotes(matchRefs, MAXIMO_POR_LOTE)) {
      const rows = await this.client.get<ApiFootballFixture>('/fixtures', { ids: lote.join('-') });
      salida.push(...rows.map(mapFixtureDetail));
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
