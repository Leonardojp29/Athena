-- El cierre de un partido deja de depender de estar despierto en el momento justo.
--
-- Hasta ahora el detalle se pedía cuando el partido transicionaba a terminado dentro del tic. Si el
-- latido no corría a esa hora, nadie volvía a pedirlo nunca: 102 de 102 partidos del 8 al 10 de
-- setiembre quedaron sin alineaciones ni estadísticas, con los datos disponibles en el proveedor.
-- Con esta tabla el cierre es un estado que se barre, no un evento que se pierde.
CREATE TABLE "match_sync" (
  "match_id"              UUID PRIMARY KEY REFERENCES "matches"("id") ON DELETE CASCADE,
  "eventos_completo"      BOOLEAN NOT NULL DEFAULT false,
  "alineaciones_completo" BOOLEAN NOT NULL DEFAULT false,
  "estadisticas_completo" BOOLEAN NOT NULL DEFAULT false,
  "jugadores_completo"    BOOLEAN NOT NULL DEFAULT false,
  "analisis_completo"     BOOLEAN NOT NULL DEFAULT false,
  "intentos"              INTEGER NOT NULL DEFAULT 0,
  "proximo_intento"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ultimo_intento"        TIMESTAMPTZ,
  "ultimo_error"          TEXT,
  -- Qué publica esta competencia, copiado de la temporada al crear la fila.
  "cobertura"             JSONB,
  -- Se fija cuando ya no queda nada que preguntar: todo completo, sin cobertura, o abandonado.
  "cerrado_en"            TIMESTAMPTZ,
  "creado_en"             TIMESTAMPTZ NOT NULL DEFAULT now(),
  "actualizado_en"        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- El barrido pregunta siempre lo mismo: qué está vencido y sin cerrar.
CREATE INDEX "match_sync_pendientes_idx" ON "match_sync" ("proximo_intento") WHERE "cerrado_en" IS NULL;

-- Los flags de cobertura del proveedor: evitan pedir lo que esa competencia no publica.
ALTER TABLE "seasons" ADD COLUMN "cobertura" JSONB;

-- Una tarea descartada tiene que poder explicar por qué.
ALTER TABLE "tareas" ADD COLUMN "ultimo_error" TEXT;
