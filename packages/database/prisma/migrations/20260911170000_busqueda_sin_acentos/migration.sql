-- Buscar "maria" no encontraba "María": el trigram compara los bytes tal cual llegan.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

-- unaccent() depende del diccionario instalado, así que Postgres la marca STABLE y no la deja
-- indexar. El envoltorio nombra el diccionario con su cast explícito —sin el cast, Postgres no
-- resuelve la sobrecarga al insertar la función en línea— y con eso la expresión ya es indexable.
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE INDEX "teams_name_busqueda_idx"
  ON "teams" USING gin (immutable_unaccent(lower("name")) gin_trgm_ops);
CREATE INDEX "players_name_busqueda_idx"
  ON "players" USING gin (immutable_unaccent(lower("name")) gin_trgm_ops);
CREATE INDEX "competitions_name_busqueda_idx"
  ON "competitions" USING gin (immutable_unaccent(lower("name")) gin_trgm_ops);

-- Los de nombre crudo quedan cubiertos por los nuevos y solo cuestan escrituras.
DROP INDEX IF EXISTS "teams_name_trgm_idx";
DROP INDEX IF EXISTS "players_name_trgm_idx";
DROP INDEX IF EXISTS "competitions_name_trgm_idx";
