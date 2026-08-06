import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmbeddingGenerator } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { EMBEDDING_GENERATOR } from '../providers/provider.tokens.js';
import { EmbeddingRepository } from './embedding.repository.js';

const BATCH_SIZE = 96;

@Injectable()
export class SyncEmbeddingsUseCase {
  private readonly logger = new Logger(SyncEmbeddingsUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: EmbeddingRepository,
    @Inject(EMBEDDING_GENERATOR) private readonly embedder: EmbeddingGenerator,
  ) {}

  async syncTeams(): Promise<number> {
    const teams = await this.prisma.team.findMany({
      select: {
        id: true,
        name: true,
        country: true,
        founded: true,
        isNationalTeam: true,
        standings: {
          where: { season: { isCurrent: true } },
          select: {
            position: true,
            points: true,
            season: { select: { competition: { select: { name: true } } } },
          },
        },
      },
    });

    const documents = teams.map((team) => ({
      entityId: team.id,
      content: [
        `Equipo de fútbol: ${team.name}.`,
        team.country ? `País: ${team.country}.` : '',
        team.founded ? `Fundado en ${team.founded}.` : '',
        team.isNationalTeam ? 'Selección nacional.' : 'Club.',
        ...team.standings.map(
          (row) =>
            `En ${row.season.competition.name} marcha ${row.position}° con ${row.points} puntos.`,
        ),
      ]
        .filter(Boolean)
        .join(' '),
    }));

    return this.writeAll('team', documents);
  }

  async syncPlayers(): Promise<number> {
    const players = await this.prisma.player.findMany({
      select: { id: true, name: true, position: true, nationality: true },
    });

    const documents = players.map((player) => ({
      entityId: player.id,
      content: [
        `Futbolista: ${player.name}.`,
        player.position ? `Posición: ${translatePosition(player.position)}.` : '',
        player.nationality ? `Nacionalidad: ${player.nationality}.` : '',
      ]
        .filter(Boolean)
        .join(' '),
    }));

    return this.writeAll('player', documents);
  }

  private async writeAll(
    entityType: string,
    documents: Array<{ entityId: string; content: string }>,
  ): Promise<number> {
    let written = 0;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      const vectors = await this.embedder.embed(batch.map((doc) => doc.content));
      for (const [index, doc] of batch.entries()) {
        const vector = vectors[index];
        if (!vector) continue;
        await this.repository.upsert(
          entityType,
          doc.entityId,
          this.embedder.model,
          doc.content,
          vector,
        );
        written++;
      }
      this.logger.log(`Embeddings ${entityType}: ${written}/${documents.length}`);
    }
    return written;
  }
}

function translatePosition(position: string): string {
  const map: Record<string, string> = {
    goalkeeper: 'arquero',
    defender: 'defensor',
    midfielder: 'mediocampista',
    attacker: 'delantero',
  };
  return map[position] ?? position;
}
