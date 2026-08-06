import { Inject, Injectable, Logger } from '@nestjs/common';
import type { FootballDataProvider } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';
import { PlayerResolverService } from './player-resolver.service.js';

/**
 * Plantilla de un equipo desde /players/squads. Sigue existiendo porque cubre a los
 * futbolistas que todavía no jugaron un minuto en la temporada y que /players no devuelve;
 * el dorsal y los acumulados los pone SyncSeasonPlayersUseCase.
 */
@Injectable()
export class SyncSquadUseCase {
  private readonly logger = new Logger(SyncSquadUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    private readonly players: PlayerResolverService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(teamRef: string, year?: number): Promise<number> {
    const squad = await this.provider.getSquad(teamRef);
    if (squad.length === 0) return 0;

    const playerIds = await this.players.resolveMany(squad);
    const teamId = await this.refs.resolve(this.provider.name, 'team', teamRef);
    if (!teamId) {
      this.logger.warn(`Equipo ${teamRef} no sincronizado`);
      return squad.length;
    }

    for (const id of playerIds.values()) {
      await this.prisma.entityRelationship.upsert({
        where: {
          fromType_fromId_relation_toType_toId: {
            fromType: 'player',
            fromId: id,
            relation: 'played_for',
            toType: 'team',
            toId: teamId,
          },
        },
        create: {
          fromType: 'player',
          fromId: id,
          relation: 'played_for',
          toType: 'team',
          toId: teamId,
        },
        update: {},
      });
    }

    if (year !== undefined) {
      for (const [providerRef, id] of playerIds) {
        const seed = squad.find((p) => p.providerRef === providerRef);
        await this.prisma.squadMembership.upsert({
          where: { teamId_playerId_year: { teamId, playerId: id, year } },
          create: { teamId, playerId: id, year, position: seed?.data.position ?? null },
          update: {},
        });
      }
    }

    this.logger.log(`Plantilla ${teamRef}: ${playerIds.size} jugadores`);
    return squad.length;
  }
}
