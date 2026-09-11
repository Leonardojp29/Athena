import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider, ProviderMatchPlayerStats } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { bulkUpsert } from './bulk-upsert.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { PlayerResolverService } from './player-resolver.service.js';

const COLUMNAS_ACTUALIZABLES = [
  'team_id',
  'shirt_number',
  'position',
  'is_starter',
  'minutes_played',
  'rating',
  'captain',
  'goals',
  'goals_conceded',
  'assists',
  'saves',
  'shots_total',
  'shots_on_target',
  'passes_total',
  'passes_key',
  'passes_accurate',
  'tackles_total',
  'interceptions',
  'duels_total',
  'duels_won',
  'dribbles_total',
  'dribbles_success',
  'fouls_committed',
  'fouls_drawn',
  'yellow_cards',
  'red_cards',
  'penalty_scored',
  'penalty_missed',
  'penalty_saved',
];

/**
 * Rendimiento por jugador de un partido: un request y con eso la cancha deja de ser un
 * dibujo y pasa a tener 22 fichas con datos detrás.
 */
@Injectable()
export class SyncMatchPlayersUseCase {
  private readonly logger = new Logger(SyncMatchPlayersUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    private readonly players: PlayerResolverService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(matchRef: string): Promise<number> {
    const matchId = await this.refs.resolve(this.provider.name, 'match', matchRef);
    if (!matchId) {
      this.logger.warn(`Partido ${matchRef} no sincronizado`);
      return 0;
    }

    const rows = await this.provider.getMatchPlayerStatistics(matchRef);
    const escritos = await this.escribir(matchId, rows);
    this.logger.log(`Partido ${matchRef}: ${escritos} jugadores con estadísticas`);
    return escritos;
  }

  async escribir(matchId: string, rows: ProviderMatchPlayerStats[]): Promise<number> {
    if (rows.length === 0) return 0;

    const teamIds = await this.refs.resolveMany(
      this.provider.name,
      'team',
      [...new Set(rows.map((r) => r.teamRef))],
    );
    /*
     * Los jugadores que aparecen acá y no están en la base se crean con el nombre corto que
     * manda el proveedor. Es lo que hay: si esperamos a /players, un suplente que debutó
     * después del sync de temporada nunca sería clickeable.
     */
    const playerIds = await this.players.resolveMany(
      rows.map((r) => ({
        providerRef: r.playerRef,
        data: {
          name: r.name,
          fullName: null,
          birthDate: null,
          nationality: null,
          heightCm: null,
          position: null,
          photoUrl: r.photoUrl,
        },
      })),
    );

    const filas: Array<Record<string, unknown>> = [];
    for (const row of rows) {
      const playerId = playerIds.get(row.playerRef);
      const teamId = teamIds.get(row.teamRef);
      if (!playerId || !teamId) continue;

      filas.push({
        match_id: matchId,
        player_id: playerId,
        team_id: teamId,
        shirt_number: row.shirtNumber,
        position: row.position,
        is_starter: row.isStarter,
        minutes_played: row.minutesPlayed,
        rating: row.rating,
        captain: row.captain,
        goals: row.goals,
        goals_conceded: row.goalsConceded,
        assists: row.assists,
        saves: row.saves,
        shots_total: row.shotsTotal,
        shots_on_target: row.shotsOnTarget,
        passes_total: row.passesTotal,
        passes_key: row.passesKey,
        passes_accurate: row.passesAccurate,
        tackles_total: row.tacklesTotal,
        interceptions: row.interceptions,
        duels_total: row.duelsTotal,
        duels_won: row.duelsWon,
        dribbles_total: row.dribblesTotal,
        dribbles_success: row.dribblesSuccess,
        fouls_committed: row.foulsCommitted,
        fouls_drawn: row.foulsDrawn,
        yellow_cards: row.yellowCards,
        red_cards: row.redCards,
        penalty_scored: row.penaltyScored,
        penalty_missed: row.penaltyMissed,
        penalty_saved: row.penaltySaved,
      });
    }

    /* Los veintidós en una sentencia: un upsert por jugador contra el pooler es un viaje cada uno. */
    await bulkUpsert(this.prisma, {
      table: 'match_player_statistics',
      conflict: ['match_id', 'player_id'],
      update: COLUMNAS_ACTUALIZABLES,
      rows: filas,
      generateId: true,
      touch: true,
    });

    return filas.length;
  }
}
