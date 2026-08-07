-- El podio del día ordena 42.000 filas por nota y filtra por minutos. Sin índice, Postgres
-- recorre la tabla entera tres veces (hoy, ayer, anteayer) y la consulta costaba segundos.
CREATE INDEX "match_player_statistics_rating_idx"
    ON "match_player_statistics"("rating" DESC NULLS LAST, "minutes_played" DESC);
