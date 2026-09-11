-- Buscar "boca" devolvía Boca Unidos antes que Boca Juniors, y "alianza" al Alianza de El Salvador
-- antes que a Alianza Lima: el parecido de texto premia al nombre más corto y no sabe nada de cuál
-- club le importa a alguien. Cuántos partidos suyos seguimos sí lo sabe —Boca Juniors 315 contra 4,
-- Alianza Lima 261 contra 10— y es un número que ya está en la base.
ALTER TABLE "teams" ADD COLUMN "relevancia" INTEGER NOT NULL DEFAULT 0;

WITH conteo AS (
  SELECT equipo_id, count(*)::int AS partidos
  FROM (
    SELECT home_team_id AS equipo_id FROM "matches"
    UNION ALL
    SELECT away_team_id FROM "matches"
  ) jugados
  GROUP BY equipo_id
)
UPDATE "teams" t
SET "relevancia" = conteo.partidos
FROM conteo
WHERE t.id = conteo.equipo_id;

CREATE INDEX "teams_relevancia_idx" ON "teams" ("relevancia" DESC);
