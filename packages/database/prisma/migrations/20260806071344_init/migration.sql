-- CreateTable
CREATE TABLE "external_references" (
    "id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_ref" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "format" TEXT NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "competition_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "is_current" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "venues" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "capacity" INTEGER,

    CONSTRAINT "venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "founded" INTEGER,
    "is_national_team" BOOLEAN NOT NULL DEFAULT false,
    "logo_url" TEXT,
    "venue_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT,
    "slug" TEXT NOT NULL,
    "birth_date" DATE,
    "nationality" TEXT,
    "height_cm" INTEGER,
    "position" TEXT,
    "photo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" UUID NOT NULL,
    "season_id" UUID NOT NULL,
    "round" TEXT,
    "home_team_id" UUID NOT NULL,
    "away_team_id" UUID NOT NULL,
    "kickoff_utc" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "status_detail" TEXT,
    "elapsed_minutes" INTEGER,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "venue_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_events" (
    "id" UUID NOT NULL,
    "match_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "extra_minute" INTEGER,
    "team_id" UUID NOT NULL,
    "player_id" UUID,
    "related_player_id" UUID,
    "detail" JSONB,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" UUID NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "model" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "lang" TEXT NOT NULL DEFAULT 'es',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_relationships" (
    "id" UUID NOT NULL,
    "from_type" TEXT NOT NULL,
    "from_id" UUID NOT NULL,
    "relation" TEXT NOT NULL,
    "to_type" TEXT NOT NULL,
    "to_id" UUID NOT NULL,
    "valid_from" DATE,
    "valid_to" DATE,
    "metadata" JSONB,

    CONSTRAINT "entity_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rollout_percent" INTEGER NOT NULL DEFAULT 100,
    "audience" JSONB,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_schedules" (
    "id" UUID NOT NULL,
    "job_kind" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_run_at" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "sync_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "external_references_entity_type_entity_id_idx" ON "external_references"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_references_provider_entity_type_provider_ref_key" ON "external_references"("provider", "entity_type", "provider_ref");

-- CreateIndex
CREATE UNIQUE INDEX "external_references_provider_entity_type_entity_id_key" ON "external_references"("provider", "entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitions_slug_key" ON "competitions"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_competition_id_year_key" ON "seasons"("competition_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "teams_slug_key" ON "teams"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "players_slug_key" ON "players"("slug");

-- CreateIndex
CREATE INDEX "players_name_idx" ON "players"("name");

-- CreateIndex
CREATE INDEX "matches_season_id_kickoff_utc_idx" ON "matches"("season_id", "kickoff_utc");

-- CreateIndex
CREATE INDEX "matches_status_kickoff_utc_idx" ON "matches"("status", "kickoff_utc");

-- CreateIndex
CREATE INDEX "match_events_match_id_minute_idx" ON "match_events"("match_id", "minute");

-- CreateIndex
CREATE INDEX "domain_events_subject_type_subject_id_occurred_at_idx" ON "domain_events"("subject_type", "subject_id", "occurred_at");

-- CreateIndex
CREATE INDEX "domain_events_kind_occurred_at_idx" ON "domain_events"("kind", "occurred_at");

-- CreateIndex
CREATE INDEX "insights_subject_type_subject_id_kind_idx" ON "insights"("subject_type", "subject_id", "kind");

-- CreateIndex
CREATE INDEX "entity_relationships_from_type_from_id_relation_idx" ON "entity_relationships"("from_type", "from_id", "relation");

-- CreateIndex
CREATE INDEX "entity_relationships_to_type_to_id_relation_idx" ON "entity_relationships"("to_type", "to_id", "relation");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "sync_schedules_job_kind_key" ON "sync_schedules"("job_kind");

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_related_player_id_fkey" FOREIGN KEY ("related_player_id") REFERENCES "players"("id") ON DELETE SET NULL ON UPDATE CASCADE;
