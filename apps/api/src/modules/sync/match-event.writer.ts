import { Injectable } from '@nestjs/common';
import type { Prisma } from '@athena/database';
import type { ProviderMatchEvent } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { ExternalReferenceService } from './external-reference.service.js';

@Injectable()
export class MatchEventWriter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly refs: ExternalReferenceService,
  ) {}

  // El proveedor no da IDs estables por evento: se reemplaza el set completo por partido.
  async replace(provider: string, matchId: string, events: ProviderMatchEvent[]): Promise<number> {
    const teamRefs = [...new Set(events.map((e) => e.teamRef))];
    const playerRefs = [
      ...new Set(
        events
          .flatMap((e) => [e.playerRef, e.relatedPlayerRef])
          .filter((r): r is string => r !== null),
      ),
    ];
    const [teams, players] = await Promise.all([
      this.refs.resolveMany(provider, 'team', teamRefs),
      this.refs.resolveMany(provider, 'player', playerRefs),
    ]);

    const rows = events
      .filter((e) => teams.has(e.teamRef))
      .map((e) => ({
        matchId,
        kind: e.kind,
        minute: e.minute,
        extraMinute: e.extraMinute,
        teamId: teams.get(e.teamRef) as string,
        playerId: e.playerRef ? (players.get(e.playerRef) ?? null) : null,
        relatedPlayerId: e.relatedPlayerRef ? (players.get(e.relatedPlayerRef) ?? null) : null,
        detail: (e.detail ?? undefined) as Prisma.InputJsonValue | undefined,
      }));

    await this.prisma.$transaction([
      this.prisma.matchEvent.deleteMany({ where: { matchId } }),
      this.prisma.matchEvent.createMany({ data: rows }),
    ]);
    return rows.length;
  }
}
