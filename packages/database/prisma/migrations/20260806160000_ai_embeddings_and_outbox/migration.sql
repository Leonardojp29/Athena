-- pgvector para búsqueda semántica, pg_trgm para búsqueda de nombres tolerante a errores
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- outbox: domain_events ya procesados en trabajo derivado
ALTER TABLE "domain_events" ADD COLUMN "processed_at" TIMESTAMP(3);
CREATE INDEX "domain_events_processed_at_idx" ON "domain_events"("processed_at");

CREATE TABLE "embeddings" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "model" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "vector" vector(1536) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embeddings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "embeddings_entity_type_entity_id_model_key"
    ON "embeddings"("entity_type", "entity_id", "model");

-- HNSW sobre distancia cosine: búsqueda aproximada rápida sin tuning de listas
CREATE INDEX "embeddings_vector_idx" ON "embeddings"
    USING hnsw ("vector" vector_cosine_ops);

ALTER TABLE "embeddings" ENABLE ROW LEVEL SECURITY;

-- búsqueda de entidades por nombre (trigram tolera acentos ausentes y typos)
CREATE INDEX "teams_name_trgm_idx" ON "teams" USING gin ("name" gin_trgm_ops);
CREATE INDEX "players_name_trgm_idx" ON "players" USING gin ("name" gin_trgm_ops);
CREATE INDEX "competitions_name_trgm_idx" ON "competitions" USING gin ("name" gin_trgm_ops);
