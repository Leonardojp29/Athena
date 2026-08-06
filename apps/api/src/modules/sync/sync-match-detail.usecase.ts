import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@athena/database';
import type { FootballDataProvider, ProviderLineupPlayer } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FOOTBALL_DATA_PROVIDER } from '../providers/provider.tokens.js';
import { ExternalReferenceService } from './external-reference.service.js';

@Injectable()
export class SyncMatchDetailUseCase {
  private readonly logger = new Logger(SyncMatchDetailUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
    @Inject(FOOTBALL_DATA_PROVIDER) private readonly provider: FootballDataProvider,
  ) {}

  async execute(matchProviderRef: string): Promise<{ statistics: number; lineups: number }> {
    const matchId = await this.refs.resolve(this.provider.name, 'match', matchProviderRef);
    if (!matchId) throw new Error(`Match not synced: ${matchProviderRef}`);

    const [statistics, lineups] = await Promise.all([
      this.provider.getMatchStatistics(matchProviderRef),
      this.provider.getMatchLineups(matchProviderRef),
    ]);

    const teamRefs = [...new Set([...statistics, ...lineups].map((item) => item.teamRef))];
    const teams = await this.refs.resolveMany(this.provider.name, 'team', teamRefs);

    let statsWritten = 0;
    for (const stat of statistics) {
      const teamId = teams.get(stat.teamRef);
      if (!teamId) continue;
      const { teamRef: _teamRef, raw, ...fields } = stat;
      const data = { ...fields, raw: raw as Prisma.InputJsonValue };
      await this.prisma.matchStatistics.upsert({
        where: { matchId_teamId: { matchId, teamId } },
        update: data,
        create: { matchId, teamId, ...data },
      });
      statsWritten++;
    }

    let lineupsWritten = 0;
    for (const lineup of lineups) {
      const teamId = teams.get(lineup.teamRef);
      if (!teamId) continue;
      const data = {
        formation: lineup.formation,
        coachName: lineup.coachName,
        startXi: (await this.withPlayerIds(lineup.startXi)) as unknown as Prisma.InputJsonValue,
        substitutes: (await this.withPlayerIds(
          lineup.substitutes,
        )) as unknown as Prisma.InputJsonValue,
      };
      await this.prisma.matchLineup.upsert({
        where: { matchId_teamId: { matchId, teamId } },
        update: data,
        create: { matchId, teamId, ...data },
      });
      lineupsWritten++;
    }

    this.logger.log(
      `Detalle de ${matchProviderRef}: ${statsWritten} equipos con stats, ${lineupsWritten} alineaciones`,
    );
    return { statistics: statsWritten, lineups: lineupsWritten };
  }

  /** Resuelve el jugador de Athena cuando ya existe; si no, queda solo el nombre. */
  private async withPlayerIds(
    players: ProviderLineupPlayer[],
  ): Promise<Array<ProviderLineupPlayer & { playerId: string | null }>> {
    const refs = players.map((p) => p.playerRef).filter((ref): ref is string => ref !== null);
    const known = await this.refs.resolveMany(this.provider.name, 'player', refs);
    return players.map((player) => ({
      ...player,
      playerId: player.playerRef ? (known.get(player.playerRef) ?? null) : null,
    }));
  }
}
