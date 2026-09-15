-- El mismo problema que tenían los equipos, ahora con las personas: buscar "ramos" devolvía cuatro
-- "D. Ramos" antes que Sergio Ramos, y "guerrero" no traía a Paolo Guerrero entre los ocho primeros.
-- El parecido de texto premia al nombre más corto y no sabe nada de a quién le importa a nadie.
--
-- Medido sobre los 355 titulares del catálogo de Adivina el XI: escribiendo el apellido, solo 81%
-- aparecía entre los ocho primeros. Los que faltaban eran Sergio Ramos, Paolo Guerrero, Alexis
-- Sánchez, Valverde y Tapia, o sea justo los que alguien escribiría.
--
-- Los minutos que Athena le siguió a cada uno sí lo saben, y ya están en la base.

ALTER TABLE "players" ADD COLUMN "relevancia" INTEGER NOT NULL DEFAULT 0;

WITH jugados AS (
  SELECT player_id, sum(coalesce(minutes_played, 0))::int AS minutos
  FROM "player_season_statistics"
  GROUP BY player_id
)
UPDATE "players" p
SET "relevancia" = jugados.minutos
FROM jugados
WHERE p.id = jugados.player_id;
