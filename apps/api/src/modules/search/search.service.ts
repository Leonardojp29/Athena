import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmbeddingGenerator } from '@athena/domain';
import { PrismaService } from '../../shared/prisma.service.js';
import { FeatureFlagService, FLAGS } from '../feature-flags/feature-flag.service.js';
import { EMBEDDING_GENERATOR } from '../providers/provider.tokens.js';
import { EmbeddingRepository } from './embedding.repository.js';

export interface SearchHit {
  type: 'team' | 'player' | 'competition';
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  subtitle: string | null;
  score: number;
  matchedBy: 'nombre' | 'semántica';
}

interface NameRow {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  subtitle: string | null;
  score: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingRepository,
    private readonly flags: FeatureFlagService,
    @Inject(EMBEDDING_GENERATOR) private readonly embedder: EmbeddingGenerator,
  ) {}

  /**
   * Búsqueda híbrida: trigram sobre nombres (rápida, tolerante a typos y acentos)
   * y, si el flag está activo, vecinos semánticos para consultas descriptivas.
   * Los resultados por nombre siempre pesan más: quien escribe "alianza" quiere el club.
   */
  async search(query: string, limit = 12): Promise<SearchHit[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const byName = await this.searchByName(trimmed, limit);
    const hits = new Map<string, SearchHit>();
    for (const hit of byName) hits.set(`${hit.type}:${hit.id}`, hit);

    if (await this.flags.isEnabled(FLAGS.semanticSearch)) {
      try {
        for (const hit of await this.searchSemantic(trimmed, limit)) {
          const key = `${hit.type}:${hit.id}`;
          if (!hits.has(key)) hits.set(key, hit);
        }
      } catch (error) {
        this.logger.warn(`Búsqueda semántica falló, se devuelve solo por nombre: ${String(error)}`);
      }
    }

    return [...hits.values()].sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async similarTeams(slug: string, limit = 6): Promise<SearchHit[]> {
    const team = await this.prisma.team.findUnique({ where: { slug }, select: { id: true } });
    if (!team) return [];

    const neighbours = await this.embeddings.similarTo('team', team.id, this.embedder.model, limit);
    if (neighbours.length === 0) return [];

    const teams = await this.prisma.team.findMany({
      where: { id: { in: neighbours.map((n) => n.entityId) } },
      select: { id: true, name: true, slug: true, logoUrl: true, country: true },
    });
    const byId = new Map(teams.map((t) => [t.id, t]));

    return neighbours.flatMap((neighbour) => {
      const found = byId.get(neighbour.entityId);
      if (!found) return [];
      return [
        {
          type: 'team' as const,
          id: found.id,
          name: found.name,
          slug: found.slug,
          imageUrl: found.logoUrl,
          subtitle: found.country,
          score: neighbour.score,
          matchedBy: 'semántica' as const,
        },
      ];
    });
  }

  private async searchByName(query: string, limit: number): Promise<SearchHit[]> {
    const [teams, players, competitions] = await Promise.all([
      this.prisma.$queryRaw<NameRow[]>`
        SELECT id::text, name, slug, logo_url AS "imageUrl", country AS subtitle,
               similarity(name, ${query}) AS score
        FROM teams
        WHERE name ILIKE ${'%' + query + '%'} OR similarity(name, ${query}) > 0.25
        ORDER BY score DESC, name ASC
        LIMIT ${limit}
      `,
      this.prisma.$queryRaw<NameRow[]>`
        SELECT id::text, name, slug, photo_url AS "imageUrl", nationality AS subtitle,
               similarity(name, ${query}) AS score
        FROM players
        WHERE name ILIKE ${'%' + query + '%'} OR similarity(name, ${query}) > 0.25
        ORDER BY score DESC, name ASC
        LIMIT ${limit}
      `,
      this.prisma.$queryRaw<NameRow[]>`
        SELECT id::text, name, slug, logo_url AS "imageUrl", country AS subtitle,
               similarity(name, ${query}) AS score
        FROM competitions
        WHERE name ILIKE ${'%' + query + '%'} OR similarity(name, ${query}) > 0.25
        ORDER BY score DESC, name ASC
        LIMIT ${limit}
      `,
    ]);

    const toHit =
      (type: SearchHit['type']) =>
      (row: NameRow): SearchHit => ({
        type,
        id: row.id,
        name: row.name,
        slug: row.slug,
        imageUrl: row.imageUrl,
        subtitle: row.subtitle,
        // +1 mantiene los aciertos por nombre por encima de los semánticos (score ≤ 1)
        score: Number(row.score) + 1,
        matchedBy: 'nombre',
      });

    return [
      ...competitions.map(toHit('competition')),
      ...teams.map(toHit('team')),
      ...players.map(toHit('player')),
    ];
  }

  private async searchSemantic(query: string, limit: number): Promise<SearchHit[]> {
    const [vector] = await this.embedder.embed([query]);
    if (!vector) return [];

    const hits = await this.embeddings.search(vector, this.embedder.model, limit);
    const teamIds = hits.filter((h) => h.entityType === 'team').map((h) => h.entityId);
    const playerIds = hits.filter((h) => h.entityType === 'player').map((h) => h.entityId);

    const [teams, players] = await Promise.all([
      teamIds.length
        ? this.prisma.team.findMany({
            where: { id: { in: teamIds } },
            select: { id: true, name: true, slug: true, logoUrl: true, country: true },
          })
        : [],
      playerIds.length
        ? this.prisma.player.findMany({
            where: { id: { in: playerIds } },
            select: { id: true, name: true, slug: true, photoUrl: true, nationality: true },
          })
        : [],
    ]);

    const teamById = new Map(teams.map((t) => [t.id, t]));
    const playerById = new Map(players.map((p) => [p.id, p]));

    return hits.flatMap((hit): SearchHit[] => {
      if (hit.entityType === 'team') {
        const team = teamById.get(hit.entityId);
        if (!team) return [];
        return [
          {
            type: 'team',
            id: team.id,
            name: team.name,
            slug: team.slug,
            imageUrl: team.logoUrl,
            subtitle: team.country,
            score: hit.score,
            matchedBy: 'semántica',
          },
        ];
      }
      const player = playerById.get(hit.entityId);
      if (!player) return [];
      return [
        {
          type: 'player',
          id: player.id,
          name: player.name,
          slug: player.slug,
          imageUrl: player.photoUrl,
          subtitle: player.nationality,
          score: hit.score,
          matchedBy: 'semántica',
        },
      ];
    });
  }
}
