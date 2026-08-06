CREATE TABLE "user_profiles" (
    "id" UUID NOT NULL,
    "display_name" TEXT,
    "lang" TEXT NOT NULL DEFAULT 'es',
    "onboarded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "favorites_user_id_entity_type_entity_id_key"
    ON "favorites"("user_id", "entity_type", "entity_id");
CREATE INDEX "favorites_entity_type_entity_id_idx" ON "favorites"("entity_type", "entity_id");

ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- El perfil se borra con la cuenta de Supabase Auth.
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_id_fkey"
    FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A diferencia del resto del schema, estas tablas SÍ llevan políticas: son datos
-- de usuario y cada uno solo puede ver y tocar los propios.
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "favorites" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_profile_select" ON "user_profiles" FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own_profile_update" ON "user_profiles" FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "own_profile_insert" ON "user_profiles" FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "own_favorites_select" ON "favorites" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_favorites_insert" ON "favorites" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_favorites_delete" ON "favorites" FOR DELETE USING (auth.uid() = user_id);
