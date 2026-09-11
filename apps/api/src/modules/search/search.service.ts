import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { paisEnEspanol, type EmbeddingGenerator } from '@athena/domain';
import { Memoria } from '../../shared/memoria.js';
import { PrismaService } from '../../shared/prisma.service.js';
import { FeatureFlagService, FLAGS } from '../feature-flags/feature-flag.service.js';
import { EMBEDDING_GENERATOR } from '../providers/provider.tokens.js';
import { EmbeddingRepository } from './embedding.repository.js';

/** Embeber la consulta cuesta ~3 s contra OpenAI: sin estos límites la búsqueda es inusable. */
const SEMANTIC_TIMEOUT_MS = 2_000;
const NAME_HITS_ENOUGH = 3;
const QUERY_EMBEDDING_TTL_SECONDS = 604_800;

/** Debajo de tres caracteres no hay trigramas: solo el prefijo puede responder. */
const LARGO_MINIMO_DIFUSO = 3;
const PESO_PREFIJO = 0.6;
const PESO_PALABRA = 0.3;

/*
 * Cuántos partidos suyos seguimos, recortado y llevado a 0–0.8. El techo importa: sin él, Real
 * Madrid con 468 partidos ganaría cualquier búsqueda, y lo que se quiere es desempatar nombres
 * parecidos, no imponer al club más grande.
 */
const RELEVANCIA_TECHO = 300;
const PESO_RELEVANCIA = 0.8;

/*
 * Quien escribe "boca" quiere Boca Juniors, no Boca Unidos: sin estos pesos gana el nombre más
 * corto, que es al que el trigram le encuentra mayor proporción de coincidencia.
 */
interface Fuente {
  tipo: SearchHit['type'];
  tabla: string;
  imagen: string;
  subtitulo: string;
  peso: number;
  /** Solo los equipos llevan la columna: son los únicos que se confunden entre sí por el nombre. */
  relevancia: boolean;
}

const FUENTES: readonly Fuente[] = [
  {
    tipo: 'competition',
    tabla: 'competitions',
    imagen: 'logo_url',
    subtitulo: 'country',
    peso: 0.15,
    relevancia: false,
  },
  {
    tipo: 'team',
    tabla: 'teams',
    imagen: 'logo_url',
    subtitulo: 'country',
    peso: 0.1,
    relevancia: true,
  },
  {
    tipo: 'player',
    tabla: 'players',
    imagen: 'photo_url',
    subtitulo: 'nationality',
    peso: 0,
    relevancia: false,
  },
];

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

/** Tres campos por fila y sin llaves repetidas: el índice viaja al navegador entero. */
export type CompactoIndice = [nombre: string, slug: string, pais: string, relevancia: number];

export interface IndiceLocal {
  equipos: CompactoIndice[];
  competencias: CompactoIndice[];
}

interface FilaIndice {
  name: string;
  slug: string;
  country: string | null;
  relevancia: number;
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
  /* Embeber cuesta ~3 s contra OpenAI: las consultas repetidas salen de acá. */
  private readonly embCache = new Memoria<number[]>(200);

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
    if (trimmed.length === 0) return [];

    const byName = await this.searchByName(trimmed, limit);
    const hits = new Map<string, SearchHit>();
    for (const hit of byName) hits.set(`${hit.type}:${hit.id}`, hit);

    // Si el nombre ya resolvió la intención, no vale gastar segundos en un embedding. Y una o dos
    // letras no son una descripción: nadie busca por significado escribiendo "u".
    const needsSemantic = byName.length < NAME_HITS_ENOUGH && trimmed.length >= LARGO_MINIMO_DIFUSO;

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

  /**
   * La vía del teclado: solo nombres. Ni el flag ni el embedding entran acá porque los dos son
   * viajes de red que el lector paga entre tecla y tecla.
   */
  async suggest(query: string, limit = 8): Promise<SearchHit[]> {
    const trimmed = query.trim();
    if (trimmed.length === 0) return [];

    const hits = await this.searchByName(trimmed, limit);
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * El índice que el navegador resuelve solo. Van los equipos que el producto muestra —los que
   * aparecen en alguna tabla de posiciones— y las competencias; los jugadores son diez veces más
   * y se quedan del lado del servidor.
   */
  async indice(): Promise<IndiceLocal> {
    const [equipos, competencias] = await Promise.all([
      this.prisma.$queryRaw<FilaIndice[]>`
        SELECT DISTINCT t.name, t.slug, t.country, t.relevancia
        FROM teams t
        WHERE t.id IN (SELECT team_id FROM standings)
        ORDER BY t.name
      `,
      this.prisma.$queryRaw<FilaIndice[]>`
        SELECT name, slug, country, 0 AS relevancia FROM competitions ORDER BY name
      `,
    ]);

    const compactar = (filas: FilaIndice[]): CompactoIndice[] =>
      filas.map((f) => [f.name, f.slug, paisEnEspanol(f.country) ?? f.country ?? '', f.relevancia]);

    return { equipos: compactar(equipos), competencias: compactar(competencias) };
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
    const cached = this.embCache.get(key);
    if (cached) return cached;

    /*
     * El vector que llega tarde se guarda igual: la consulta que hoy venció es la que el lector
     * está por reintentar, y descartarla convertía cada reintento en otra llamada paga.
     */
    const pedido = this.embedder.embed([query]).then((v) => {
      const vector = v[0] ?? null;
      if (vector) this.embCache.set(key, vector, QUERY_EMBEDDING_TTL_SECONDS);
      return vector;
    });
    pedido.catch(() => null);

    let avisar: ReturnType<typeof setTimeout>;
    const vencimiento = new Promise<null>((resolve) => {
      avisar = setTimeout(() => resolve(null), SEMANTIC_TIMEOUT_MS);
    });
    const vector = await Promise.race([pedido, vencimiento]).finally(() => clearTimeout(avisar));

    if (!vector) {
      this.logger.warn(`Embedding de la consulta excedió ${SEMANTIC_TIMEOUT_MS} ms: "${query}"`);
      return null;
    }
    return vector;
  }

  /**
   * Una consulta de una o dos letras no tiene trigramas, así que solo puede resolverse por
   * prefijo; de tres en adelante entran el parecido difuso y el infijo. Los tres nombres se
   * comparan sin acentos y en minúscula contra las expresiones que indexa la base.
   */
  private consultaDeNombre(fuente: Fuente, largo: number): string {
    const nombre = 'immutable_unaccent(lower(f.name))';
    const condicion =
      largo < LARGO_MINIMO_DIFUSO
        ? `${nombre} LIKE c.q || '%'`
        : `${nombre} % c.q OR ${nombre} LIKE '%' || c.q || '%'`;

    const relevancia = fuente.relevancia
      ? `+ ${PESO_RELEVANCIA} * least(f.relevancia, ${RELEVANCIA_TECHO})::float / ${RELEVANCIA_TECHO}`
      : '';

    return `
      WITH c AS (SELECT immutable_unaccent(lower($1::text)) AS q)
      SELECT f.id::text, f.name, f.slug,
             f.${fuente.imagen} AS "imageUrl", f.${fuente.subtitulo} AS subtitle,
             similarity(${nombre}, c.q)
               + CASE WHEN ${nombre} LIKE c.q || '%' THEN ${PESO_PREFIJO}
                      WHEN ${nombre} LIKE '% ' || c.q || '%' THEN ${PESO_PALABRA}
                      ELSE 0 END
               ${relevancia} AS score
      FROM ${fuente.tabla} f, c
      WHERE ${condicion}
      ORDER BY score DESC, f.name ASC
      LIMIT $2`;
  }

  private async searchByName(query: string, limit: number): Promise<SearchHit[]> {
    const porFuente = await Promise.all(
      FUENTES.map(async (fuente) => {
        const filas = await this.prisma.$queryRawUnsafe<NameRow[]>(
          this.consultaDeNombre(fuente, query.length),
          query,
          limit,
        );
        return filas.map(
          (row): SearchHit => ({
            type: fuente.tipo,
            id: row.id,
            name: row.name,
            slug: row.slug,
            imageUrl: row.imageUrl,
            subtitle: paisEnEspanol(row.subtitle) ?? row.subtitle,
            // +1 mantiene los aciertos por nombre por encima de los semánticos (score ≤ 1)
            score: Number(row.score) + fuente.peso + 1,
            matchedBy: 'nombre',
          }),
        );
      }),
    );

    return porFuente.flat();
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
