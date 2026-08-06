-- Rendimiento por jugador: lo que hace clickeable la cancha y da contenido a la ficha.
-- Escrita a mano: `migrate dev` intentaría rehacer las extensiones de Supabase como drift.

CREATE TABLE "match_player_statistics" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "shirt_number" INTEGER,
    "position" TEXT,
    "is_starter" BOOLEAN NOT NULL DEFAULT false,
    "minutes_played" INTEGER,
    "rating" DECIMAL(3,1),
    "captain" BOOLEAN NOT NULL DEFAULT false,
    "goals" INTEGER,
    "goals_conceded" INTEGER,
    "assists" INTEGER,
    "saves" INTEGER,
    "shots_total" INTEGER,
    "shots_on_target" INTEGER,
    "passes_total" INTEGER,
    "passes_key" INTEGER,
    -- en /fixtures/players "accuracy" es el conteo de pases logrados, no un porcentaje
    "passes_accurate" INTEGER,
    "tackles_total" INTEGER,
    "interceptions" INTEGER,
    "duels_total" INTEGER,
    "duels_won" INTEGER,
    "dribbles_total" INTEGER,
    "dribbles_success" INTEGER,
    "fouls_committed" INTEGER,
    "fouls_drawn" INTEGER,
    "yellow_cards" INTEGER,
    "red_cards" INTEGER,
    "penalty_scored" INTEGER,
    "penalty_missed" INTEGER,
    "penalty_saved" INTEGER,
    "raw" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_player_statistics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_player_statistics_match_id_player_id_key"
    ON "match_player_statistics"("match_id", "player_id");
CREATE INDEX "match_player_statistics_player_id_match_id_idx"
    ON "match_player_statistics"("player_id", "match_id");
CREATE INDEX "match_player_statistics_match_id_team_id_idx"
    ON "match_player_statistics"("match_id", "team_id");

CREATE TABLE "player_season_statistics" (
    "id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "appearances" INTEGER,
    "lineups" INTEGER,
    "minutes_played" INTEGER,
    "rating" DECIMAL(4,2),
    "goals" INTEGER,
    "assists" INTEGER,
    "shots_total" INTEGER,
    "shots_on_target" INTEGER,
    "passes_total" INTEGER,
    "passes_key" INTEGER,
    -- en /players sí es un porcentaje
    "passes_accuracy_percent" INTEGER,
    "duels_won" INTEGER,
    "dribbles_success" INTEGER,
    "yellow_cards" INTEGER,
    "red_cards" INTEGER,
    "penalty_scored" INTEGER,
    "raw" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_season_statistics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "player_season_statistics_player_id_season_id_team_id_key"
    ON "player_season_statistics"("player_id", "season_id", "team_id");
CREATE INDEX "player_season_statistics_season_id_team_id_idx"
    ON "player_season_statistics"("season_id", "team_id");

CREATE TABLE "squad_memberships" (
    "id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "player_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "shirt_number" INTEGER,
    "position" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "squad_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "squad_memberships_team_id_player_id_year_key"
    ON "squad_memberships"("team_id", "player_id", "year");
CREATE INDEX "squad_memberships_player_id_year_idx"
    ON "squad_memberships"("player_id", "year");

ALTER TABLE "match_player_statistics" ADD CONSTRAINT "match_player_statistics_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_player_statistics" ADD CONSTRAINT "match_player_statistics_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_player_statistics" ADD CONSTRAINT "match_player_statistics_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "player_season_statistics" ADD CONSTRAINT "player_season_statistics_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_season_statistics" ADD CONSTRAINT "player_season_statistics_season_id_fkey"
    FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "player_season_statistics" ADD CONSTRAINT "player_season_statistics_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "squad_memberships" ADD CONSTRAINT "squad_memberships_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "squad_memberships" ADD CONSTRAINT "squad_memberships_player_id_fkey"
    FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Sin políticas: el acceso público va por el API con la service role, igual que el resto
-- del plano de datos. RLS activo deja la tabla cerrada a anon en lugar de "unrestricted".
ALTER TABLE "match_player_statistics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "player_season_statistics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "squad_memberships" ENABLE ROW LEVEL SECURITY;
