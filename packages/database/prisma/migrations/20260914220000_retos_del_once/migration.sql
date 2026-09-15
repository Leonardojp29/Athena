-- El catálogo propio de Adivina el XI.
--
-- No referencia `matches` ni `match_lineups` a propósito: Athena no tiene los partidos viejos. De
-- la Champions solo guarda alineaciones desde la temporada 2021, del Mundial solo 2026 y de la
-- Copa América solo 2024, así que apoyarse en ellos obligaría a importar mundiales enteros al
-- modelo de competencias para alimentar un juego. Esto es una instantánea del partido.
--
-- El once sí apunta a `players`, para que el nombre y la foto sigan al futbolista si se corrigen.

CREATE TABLE "retos_del_once" (
  "id"                   BIGSERIAL PRIMARY KEY,
  "clave"                TEXT NOT NULL,
  "catalogo"             TEXT NOT NULL,
  "dificultad"           TEXT NOT NULL,
  -- El fixture de API-Football: con él se rehace el reto sin volver a buscarlo en la temporada.
  "fixture_ref"          TEXT NOT NULL,
  "competencia"          TEXT NOT NULL,
  "competencia_logo_url" TEXT,
  "temporada"            TEXT NOT NULL,
  "fase"                 TEXT,
  "jugado_en"            DATE NOT NULL,
  "objetivo_nombre"      TEXT NOT NULL,
  "objetivo_escudo_url"  TEXT,
  -- Null cuando el equipo no es una entidad de Athena; el reto se juega igual.
  "objetivo_team_id"     UUID REFERENCES "teams"("id"),
  "rival_nombre"         TEXT NOT NULL,
  "rival_escudo_url"     TEXT,
  "de_local"             BOOLEAN NOT NULL,
  "goles_objetivo"       INTEGER NOT NULL,
  "goles_rival"          INTEGER NOT NULL,
  "nota"                 TEXT,
  "formacion"            TEXT NOT NULL,
  -- Verdadero cuando la disposición se escribió a mano porque el proveedor no la publica.
  "a_mano"               BOOLEAN NOT NULL DEFAULT false,
  "actualizado_en"       TIMESTAMPTZ(3) NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "retos_del_once_clave_key" ON "retos_del_once" ("clave");
-- El sorteo filtra por las dos cosas a la vez y nunca por una sola, así que el índice es compuesto.
CREATE INDEX "retos_del_once_catalogo_dificultad_idx" ON "retos_del_once" ("catalogo", "dificultad");

CREATE TABLE "titulares_del_reto" (
  "id"        BIGSERIAL PRIMARY KEY,
  "reto_id"   BIGINT NOT NULL REFERENCES "retos_del_once"("id") ON DELETE CASCADE,
  "player_id" UUID NOT NULL REFERENCES "players"("id"),
  -- 'fila:columna' desde el arco propio, como las numera el proveedor.
  "grid"      TEXT NOT NULL,
  "puesto"    TEXT,
  "dorsal"    INTEGER
);

-- El mismo futbolista no puede ocupar dos casillas del mismo once.
CREATE UNIQUE INDEX "titular_unico" ON "titulares_del_reto" ("reto_id", "player_id");
-- El once se lee siempre entero y por reto; la clave foránea sola no da un índice.
CREATE INDEX "titulares_del_reto_reto_id_idx" ON "titulares_del_reto" ("reto_id");
