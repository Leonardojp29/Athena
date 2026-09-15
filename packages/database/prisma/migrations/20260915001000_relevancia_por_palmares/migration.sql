-- La relevancia por minutos no servía, y conviene dejar escrito por qué.
--
-- Athena cubre unas ligas mucho más densamente que otras, así que los minutos miden cobertura y no
-- fama: Renato Tapia tenía 1.023 y un Rodrigo Tapia de liga local 1.894; Sergio Ramos tenía 360 y
-- quedaba detrás de seis homónimos. Buscar "ramos" seguía sin traerlo.
--
-- El palmarés sí mide fama y ya está completo —27.908 futbolistas revisados—. Con títulos, los
-- cuatro casos que fallaban quedan primeros de su apellido: Sergio Ramos 44, Alexis Sánchez 35,
-- Paolo Guerrero 17 y Renato Tapia 8.
--
-- Los minutos siguen sumando, pero como desempate entre quienes no ganaron nada y topados, para que
-- un futbolista muy seguido no le gane a uno con títulos.

WITH señales AS (
  SELECT p.id,
         (SELECT count(*) FROM "player_trophies" t WHERE t.player_id = p.id) AS titulos,
         (SELECT coalesce(sum(coalesce(s.minutes_played, 0)), 0)
            FROM "player_season_statistics" s WHERE s.player_id = p.id) AS minutos
  FROM "players" p
)
UPDATE "players" p
SET "relevancia" = (señales.titulos * 100 + least(señales.minutos, 3000) / 10)::int
FROM señales
WHERE p.id = señales.id;
