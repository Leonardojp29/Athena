-- La dieta: los payloads crudos duplicaban las columnas tipadas sin un solo lector (~370 MB).
-- Una métrica nueva a futuro se re-pide al proveedor con los backfills; no se acumula "por si acaso".
ALTER TABLE "match_player_statistics" DROP COLUMN "raw";
ALTER TABLE "player_season_statistics" DROP COLUMN "raw";
ALTER TABLE "match_statistics" DROP COLUMN "raw";

-- Embeddings a media precisión. El índice usa vector_cosine_ops y no acepta halfvec:
-- tiene que caer ANTES del cambio de tipo. No se recrea: con ~9k filas el scan exacto
-- es recall 100% y las rutas que lo usan ya cachean; un HNSW con halfvec_cosine_ops
-- vuelve a valer la pena recién hacia las ~50k filas.
DROP INDEX "embeddings_vector_idx";
ALTER TABLE "embeddings" ALTER COLUMN "vector" TYPE halfvec(1536) USING "vector"::halfvec(1536);

-- El login se va (decisión 2026-08-18): con estas dos tablas mueren la FK a auth.users
-- y las políticas auth.uid() — las últimas ataduras del esquema a Supabase.
DROP TABLE "favorites";
DROP TABLE "user_profiles";
