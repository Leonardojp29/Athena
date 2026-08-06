import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma.service.js';

export interface VectorHit {
  entityType: string;
  entityId: string;
  score: number;
}

export interface EntityHit extends VectorHit {
  name: string;
  slug: string;
  imageUrl: string | null;
  subtitle: string | null;
}

/**
 * Único lugar con SQL crudo de pgvector: Prisma no soporta el tipo `vector`,
 * así que la aritmética de vectores queda encapsulada acá (ADR-003).
 */
@Injectable()
export class EmbeddingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    entityType: string,
    entityId: string,
    model: string,
    content: string,
    vector: number[],
  ): Promise<void> {
    const literal = toVectorLiteral(vector);
    await this.prisma.$executeRaw`
      INSERT INTO embeddings (id, entity_type, entity_id, model, content, vector, updated_at)
      VALUES (gen_random_uuid(), ${entityType}, ${entityId}::uuid, ${model}, ${content}, ${literal}::vector, now())
      ON CONFLICT (entity_type, entity_id, model)
      DO UPDATE SET content = EXCLUDED.content, vector = EXCLUDED.vector, updated_at = now()
    `;
  }

  async search(
    vector: number[],
    model: string,
    limit: number,
    entityType?: string,
  ): Promise<VectorHit[]> {
    const literal = toVectorLiteral(vector);
    const rows = entityType
      ? await this.prisma.$queryRaw<VectorHit[]>`
          SELECT entity_type AS "entityType", entity_id::text AS "entityId",
                 1 - (vector <=> ${literal}::vector) AS score
          FROM embeddings
          WHERE model = ${model} AND entity_type = ${entityType}
          ORDER BY vector <=> ${literal}::vector
          LIMIT ${limit}
        `
      : await this.prisma.$queryRaw<VectorHit[]>`
          SELECT entity_type AS "entityType", entity_id::text AS "entityId",
                 1 - (vector <=> ${literal}::vector) AS score
          FROM embeddings
          WHERE model = ${model}
          ORDER BY vector <=> ${literal}::vector
          LIMIT ${limit}
        `;
    return rows;
  }

  async similarTo(
    entityType: string,
    entityId: string,
    model: string,
    limit: number,
  ): Promise<VectorHit[]> {
    return this.prisma.$queryRaw<VectorHit[]>`
      SELECT e.entity_type AS "entityType", e.entity_id::text AS "entityId",
             1 - (e.vector <=> source.vector) AS score
      FROM embeddings e
      CROSS JOIN (
        SELECT vector FROM embeddings
        WHERE entity_type = ${entityType} AND entity_id = ${entityId}::uuid AND model = ${model}
      ) AS source
      WHERE e.model = ${model} AND e.entity_type = ${entityType} AND e.entity_id <> ${entityId}::uuid
      ORDER BY e.vector <=> source.vector
      LIMIT ${limit}
    `;
  }

  /**
   * Vecinos semánticos con los datos de la entidad ya resueltos: un round-trip en
   * lugar de dos, lo que importa cuando la base está lejos del API.
   */
  async searchWithEntities(vector: number[], model: string, limit: number): Promise<EntityHit[]> {
    const literal = toVectorLiteral(vector);
    return this.prisma.$queryRaw<EntityHit[]>`
      SELECT e.entity_type AS "entityType",
             e.entity_id::text AS "entityId",
             1 - (e.vector <=> ${literal}::vector) AS score,
             COALESCE(t.name, p.name) AS name,
             COALESCE(t.slug, p.slug) AS slug,
             COALESCE(t.logo_url, p.photo_url) AS "imageUrl",
             COALESCE(t.country, p.nationality) AS subtitle
      FROM embeddings e
      LEFT JOIN teams t ON e.entity_type = 'team' AND t.id = e.entity_id
      LEFT JOIN players p ON e.entity_type = 'player' AND p.id = e.entity_id
      WHERE e.model = ${model}
        AND (t.id IS NOT NULL OR p.id IS NOT NULL)
      ORDER BY e.vector <=> ${literal}::vector
      LIMIT ${limit}
    `;
  }

  async countByModel(model: string): Promise<number> {
    const rows = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM embeddings WHERE model = ${model}
    `;
    return Number(rows[0]?.count ?? 0);
  }
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
