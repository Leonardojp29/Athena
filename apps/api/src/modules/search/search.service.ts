import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EmbeddingGenerator } from '@athena/domain';
import type { Redis } from 'ioredis';
import { PrismaService } from '../../shared/prisma.service.js';
import { REDIS } from '../../shared/redis.provider.js';
import { FeatureFlagService, FLAGS } from '../feature-flags/feature-flag.service.js';
import { EMBEDDING_GENERATOR } from '../providers/provider.tokens.js';
import { EmbeddingRepository } from './embedding.repository.js';

/** Embeber la consulta cuesta ~3 s contra OpenAI: sin estos límites la búsqueda es inusable. */
const SEMANTIC_TIMEOUT_MS = 2_000;
const NAME_HITS_ENOUGH = 3;
const QUERY_EMBEDDING_TTL_SECONDS = 604_800;

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
    @Inject(REDIS) private readonly redis: Redis,
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

    // Si el nombre ya resolvió la intención, no vale gastar segundos en un embedding.
    const needsSemantic = byName.length < NAME_HITS_ENOUGH;

    if (needsSemantic && (await this.flags.isEnabled(FLAGS.semanticSearch))) {
      try {
        for (const hit of await this.searchSemantic(trimmed, limit)) {
          const key = `${hit.type}:${hit.id}`;
          if (!hits.has(key)) hits.set(key, hit);
        }
      } catch (error) {
        this.logger.warn(`Búsqueda semántica omitida: ${String(error)}`);
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

  /**
   * Cachea el vector de la consulta y aborta si el proveedor tarda: una búsqueda
   * lenta es peor que una búsqueda sin resultados semánticos.
   */
  private async embedQuery(query: string): Promise<number[] | null> {
    const key = `athena:embcache:${this.embedder.model}:${createHash('sha1').update(query.toLowerCase()).digest('hex')}`;
    const cached = await this.redis.get(key);
    if (cached) return JSON.parse(cached) as number[];

    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), SEMANTIC_TIMEOUT_MS),
    );
    const vector = await Promise.race([
      this.embedder.embed([query]).then((v) => v[0] ?? null),
      timeout,
    ]);
    if (!vector) {
      this.logger.warn(`Embedding de la consulta excedió ${SEMANTIC_TIMEOUT_MS} ms: "${query}"`);
      return null;
    }

    await this.redis.set(key, JSON.stringify(vector), 'EX', QUERY_EMBEDDING_TTL_SECONDS);
    return vector;
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
    const vector = await this.embedQuery(query);
    if (!vector) return [];

    const hits = await this.embeddings.searchWithEntities(vector, this.embedder.model, limit);
    return hits.map((hit) => ({
      type: hit.entityType === 'team' ? 'team' : 'player',
      id: hit.entityId,
      name: hit.name,
      slug: hit.slug,
      imageUrl: hit.imageUrl,
      subtitle: hit.subtitle,
      score: Number(hit.score),
      matchedBy: 'semántica' as const,
    }));
  }
}
