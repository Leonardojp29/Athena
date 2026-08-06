# ADR-003 — Postgres para grafo, vectores y búsqueda

**Estado**: Aceptada · **Fecha**: 2026-08-06

## Problema

Athena necesita relaciones tipo grafo (`similar_to`, `played_for`), búsqueda semántica (embeddings) y búsqueda de texto. ¿Base de grafos (Neo4j), motor de búsqueda (Elasticsearch) y vector store dedicados?

## Decisión

PostgreSQL (Supabase) para todo, mientras los datos no demuestren lo contrario:

- **Grafo** → tabla `entity_relationships` con índices por origen/destino/relación.
- **Vectores** → extensión **pgvector** (disponible en Supabase). Prisma no la soporta nativamente: las consultas de similitud usan SQL crudo tipado encapsulado en el repositorio de `search`.
- **Texto** → Postgres FTS (diccionario español) + `pg_trgm` para nombres; evoluciona a búsqueda híbrida FTS+vectores con re-ranking (RRF) en Fase 4 detrás de la misma interfaz `SearchService`.

## Trade-offs

- (+) Una sola base operativa: backups, migraciones y transacciones unificadas; cero infra nueva.
- (−) A escala muy grande, motores dedicados rinden más. Umbral de revisión documentado: si p95 de búsqueda >300 ms o las consultas de grafo dominan el workload, evaluar extracción.
