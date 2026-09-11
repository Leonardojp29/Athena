-- Los índices que las páginas de entidad necesitan y Prisma no crea solo.
--
-- Prisma no indexa las claves foráneas en Postgres, y las vistas filtran por equipo y por jugador.
-- Medido con EXPLAIN ANALYZE sobre la base real: los eventos de un jugador tardaban 3,35 s con un
-- Seq Scan sobre match_events, y el historial de un equipo 48 ms con otro sobre matches.
CREATE INDEX "match_events_player_id_idx" ON "match_events" ("player_id");
CREATE INDEX "matches_home_team_id_kickoff_utc_idx" ON "matches" ("home_team_id", "kickoff_utc" DESC);
CREATE INDEX "matches_away_team_id_kickoff_utc_idx" ON "matches" ("away_team_id", "kickoff_utc" DESC);

-- El equipo en la primera posición: el índice que ya existía lleva match_id adelante y no sirve
-- para "las notas de este club", que es como lo pregunta la página del equipo.
CREATE INDEX "match_player_statistics_team_id_match_id_idx" ON "match_player_statistics" ("team_id", "match_id");
