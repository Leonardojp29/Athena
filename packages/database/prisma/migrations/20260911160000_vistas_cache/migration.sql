-- El segundo nivel de la caché de vistas, compartido por todas las instancias.
--
-- La caché en memoria del proceso sirve mientras la instancia vive; en serverless cada arranque en
-- frío recalculaba las once consultas de una competencia. Acá el cálculo se guarda una vez y
-- cualquier instancia lo sirve con una sola lectura por clave primaria.
CREATE TABLE "vistas_cache" (
  "clave"        TEXT PRIMARY KEY,
  "cuerpo"       JSONB NOT NULL,
  -- Hasta cuándo se sirve sin pensar; pasado esto se sirve igual y se renueva por detrás.
  "fresca_hasta" TIMESTAMPTZ NOT NULL,
  -- Pasado esto ya no se sirve: mejor esperar el cálculo que mostrar algo de ayer.
  "vence_en"     TIMESTAMPTZ NOT NULL,
  "calculada_en" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX "vistas_cache_vence_en_idx" ON "vistas_cache" ("vence_en");
