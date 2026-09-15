-- El catálogo de El Impostor: seis futbolistas por ronda, cinco cumplen una condición y uno no.
--
-- Vive aparte de `retos_del_once` porque la pregunta es otra: allá hay un partido y una cancha que
-- dibujar, acá una afirmación y seis caras. Compartir tabla habría obligado a media docena de
-- columnas nulas en cada fila.
--
-- El `provider_ref` va denormalizado en la opción, como en el otro juego: de ahí sale la foto y es
-- la identidad que compara el navegador, así que un reto se lee entero de una sola vez.

CREATE TABLE "retos_del_impostor" (
  "id"             BIGSERIAL PRIMARY KEY,
  "clave"          TEXT NOT NULL,
  "dificultad"     TEXT NOT NULL,
  "categoria"      TEXT NOT NULL,
  "enunciado"      TEXT NOT NULL,
  "reveal"         TEXT NOT NULL,
  -- Verdadero cuando el proveedor no cubre la temporada y la verdad la respalda el editor.
  "validado_a_mano" BOOLEAN NOT NULL DEFAULT false,
  "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "retos_del_impostor_clave_key" ON "retos_del_impostor" ("clave");

CREATE TABLE "opciones_del_impostor" (
  "id"           BIGSERIAL PRIMARY KEY,
  "reto_id"      BIGINT NOT NULL REFERENCES "retos_del_impostor"("id") ON DELETE CASCADE,
  "player_id"    UUID NOT NULL REFERENCES "players"("id"),
  "provider_ref" TEXT NOT NULL,
  "es_impostor"  BOOLEAN NOT NULL
);

-- El mismo futbolista no puede aparecer dos veces entre las seis cartas.
CREATE UNIQUE INDEX "opcion_unica" ON "opciones_del_impostor" ("reto_id", "player_id");
-- Las seis se leen siempre juntas y por reto; la clave foránea sola no da un índice.
CREATE INDEX "opciones_del_impostor_reto_id_idx" ON "opciones_del_impostor" ("reto_id");
