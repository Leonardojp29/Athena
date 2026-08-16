-- El backend deja Redis y BullMQ: todo el estado compartido pasa a Postgres.
--
-- La razón es el despliegue: Vercel no ejecuta procesos permanentes, así que no hay dónde tener un
-- worker escuchando una cola ni un Redis encendido. Y Supabase ya está pagado con creces: pg_cron
-- dispara el tic del vivo cada minuto contra un endpoint del API, y estas dos tablas guardan lo que
-- antes vivía en Redis. En desarrollo el worker sigue siendo un proceso, pero usa exactamente el
-- mismo camino: un solo código para las dos formas de correr.

-- La cola de trabajos. FOR UPDATE SKIP LOCKED da lo que daba BullMQ para este volumen: decenas de
-- tareas por minuto, no miles por segundo.
CREATE TABLE IF NOT EXISTS "tareas" (
  "id"            BIGSERIAL PRIMARY KEY,
  "tipo"          TEXT NOT NULL,
  "datos"         JSONB NOT NULL DEFAULT '{}',
  -- Menor corre antes: la tabla de posiciones (1) nunca espera detrás de un fixtures (5).
  "prioridad"     INTEGER NOT NULL DEFAULT 5,
  "corre_despues" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "intentos"      INTEGER NOT NULL DEFAULT 0,
  -- Mientras un proceso la trabaja nadie más la toma; si muere sin terminar, vence y se retoma.
  "tomada_hasta"  TIMESTAMPTZ,
  "creada_en"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "tareas_pendientes_idx"
  ON "tareas" ("prioridad", "corre_despues", "id");

-- El estado compartido chico: la cuota real de API-Football (que reportan sus headers y comparten
-- todos los procesos), el gasto diario de tokens de OpenAI y las marcas de espera de los reintentos.
CREATE TABLE IF NOT EXISTS "kv" (
  "clave"    TEXT PRIMARY KEY,
  "numero"   BIGINT,
  "vence_en" TIMESTAMPTZ
);
