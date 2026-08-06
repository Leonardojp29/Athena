import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { bulkUpsert } from './bulk-upsert.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { PlayerResolverService } from './player-resolver.service.js';

/**
 * Bios y acumulados de temporada de una competencia. Corre ANTES del backfill de
 * estadísticas por partido: el slug se asigna al crear y no se toca nunca, así que si el
 * jugador nace de una alineación queda como "j-alarcon" para siempre.
 *
 * De acá salen también el dorsal y la pertenencia a la plantilla, sin pedir /players/squads.
 */
@Injectable()
export class SyncSeasonPlayersUseCase {
  private readonly logger = new Logger(SyncSeasonPlayersUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    private readonly players: PlayerResolverService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(competitionRef: string, seasonYear: number): Promise<number> {
    const rows = await this.provider.getSeasonPlayers(competitionRef, seasonYear);
    if (rows.length === 0) {
      this.logger.warn(`Sin jugadores para liga ${competitionRef} temporada ${seasonYear}`);
      return 0;
    }

    const competitionId = await this.refs.resolve(
      this.provider.name,
      'competition',
      competitionRef,
    );
    if (!competitionId) {
      this.logger.warn(`Competencia ${competitionRef} no sincronizada`);
      return 0;
    }
    const season = await this.prisma.season.findUnique({
      where: { competitionId_year: { competitionId, year: seasonYear } },
      select: { id: true },
    });
    if (!season) {
      this.logger.warn(`Temporada ${seasonYear} de ${competitionRef} no sincronizada`);
      return 0;
    }

    const teamIds = await this.refs.resolveMany(this.provider.name, 'team', [
      ...new Set(rows.map((r) => r.teamRef)),
    ]);
    const playerIds = await this.players.resolveMany(rows.map((r) => r.player));

    const stats: Array<Record<string, unknown>> = [];
    const plantilla: Array<Record<string, unknown>> = [];
    const vinculos: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const playerId = playerIds.get(row.player.providerRef);
      const teamId = teamIds.get(row.teamRef);
      if (!playerId || !teamId) continue;

      const t = row.totals;
      stats.push({
        player_id: playerId,
        season_id: season.id,
        team_id: teamId,
        appearances: t.appearances,
        lineups: t.lineups,
        minutes_played: t.minutesPlayed,
        rating: t.rating,
        goals: t.goals,
        assists: t.assists,
        shots_total: t.shotsTotal,
        shots_on_target: t.shotsOnTarget,
        passes_total: t.passesTotal,
        passes_key: t.passesKey,
        passes_accuracy_percent: t.passesAccuracyPercent,
        duels_won: t.duelsWon,
        dribbles_success: t.dribblesSuccess,
        yellow_cards: t.yellowCards,
        red_cards: t.redCards,
        penalty_scored: t.penaltyScored,
        raw: t.raw,
      });
      plantilla.push({
        team_id: teamId,
        player_id: playerId,
        year: seasonYear,
        shirt_number: row.shirtNumber,
        position: row.player.data.position,
      });
      vinculos.push({
        from_type: 'player',
        from_id: playerId,
        relation: 'played_for',
        to_type: 'team',
        to_id: teamId,
      });
    }

    await bulkUpsert(this.prisma, {
      table: 'player_season_statistics',
      conflict: ['player_id', 'season_id', 'team_id'],
      update: [
        'appearances',
        'lineups',
        'minutes_played',
        'rating',
        'goals',
        'assists',
        'shots_total',
        'shots_on_target',
        'passes_total',
        'passes_key',
        'passes_accuracy_percent',
        'duels_won',
        'dribbles_success',
        'yellow_cards',
        'red_cards',
        'penalty_scored',
        'raw',
      ],
      rows: stats,
      generateId: true,
      touch: true,
      jsonColumns: ['raw'],
    });

    await bulkUpsert(this.prisma, {
      table: 'squad_memberships',
      conflict: ['team_id', 'player_id', 'year'],
      update: ['shirt_number', 'position'],
      rows: plantilla,
      generateId: true,
      touch: true,
    });

    /* `played_for` no lleva nada que actualizar: alcanza con que la arista exista. */
    await bulkUpsert(this.prisma, {
      table: 'entity_relationships',
      conflict: ['from_type', 'from_id', 'relation', 'to_type', 'to_id'],
      update: ['relation'],
      rows: vinculos,
      generateId: true,
    });

    this.logger.log(
      `Liga ${competitionRef} ${seasonYear}: ${stats.length}/${rows.length} jugadores con temporada`,
    );
    return stats.length;
  }
}
