CREATE TABLE "match_statistics" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "possession_percent" INTEGER,
    "shots_total" INTEGER,
    "shots_on_goal" INTEGER,
    "shots_off_goal" INTEGER,
    "shots_blocked" INTEGER,
    "corners" INTEGER,
    "offsides" INTEGER,
    "fouls" INTEGER,
    "yellow_cards" INTEGER,
    "red_cards" INTEGER,
    "goalkeeper_saves" INTEGER,
    "passes_total" INTEGER,
    "passes_accurate" INTEGER,
    "passes_percent" INTEGER,
    "expected_goals" DECIMAL(5,2),
    "raw" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_statistics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_statistics_match_id_team_id_key" ON "match_statistics"("match_id", "team_id");

CREATE TABLE "match_lineups" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "formation" TEXT,
    "coach_name" TEXT,
    "start_xi" JSONB NOT NULL,
    "substitutes" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_lineups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_lineups_match_id_team_id_key" ON "match_lineups"("match_id", "team_id");

ALTER TABLE "match_statistics" ADD CONSTRAINT "match_statistics_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_statistics" ADD CONSTRAINT "match_statistics_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "match_lineups" ADD CONSTRAINT "match_lineups_team_id_fkey"
    FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "match_statistics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "match_lineups" ENABLE ROW LEVEL SECURITY;
