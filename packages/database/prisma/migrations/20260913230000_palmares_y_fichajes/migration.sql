-- El palmarés de un futbolista y los movimientos de mercado de un club.
--
-- Dos datos que API-Football ya sirve en el plan y que Athena no guardaba. El palmarés convierte una
-- planilla de minutos en una trayectoria; los fichajes le dan a la web algo que contar los días sin
-- fútbol, que hoy es cuando no hay razón para entrar.

-- El torneo va como texto y no como llave a "competitions" porque el proveedor manda el nombre y no
-- su id: "CONMEBOL Sudamericana" es todo lo que llega. Y la temporada es opcional porque el 45% de
-- las filas viene sin año —medido sobre datos reales, 14 de 31 en Paolo Guerrero—.
CREATE TABLE "player_trophies" (
  "id"             BIGSERIAL      NOT NULL,
  "player_id"      UUID           NOT NULL,
  "competencia"    TEXT           NOT NULL,
  "pais"           TEXT,
  "temporada"      TEXT,
  -- campeon | subcampeon
  "puesto"         TEXT           NOT NULL,
  "actualizado_en" TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

  CONSTRAINT "player_trophies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "player_trophies_player_id_fkey" FOREIGN KEY ("player_id")
    REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- La única consulta que existe: el palmarés de un jugador, lo más nuevo arriba. Postgres no indexa
-- las llaves foráneas solo, y sin esto la ficha recorre la tabla entera.
CREATE INDEX "player_trophies_player_id_temporada_idx"
  ON "player_trophies" ("player_id", "temporada" DESC);

-- Un pase cruza casi siempre a una liga que Athena no cubre, así que el nombre del club se guarda
-- siempre y la llave al equipo solo cuando se la puede resolver. Sin eso, la mitad de los fichajes
-- de Alianza serían filas mudas.
CREATE TABLE "transfers" (
  "id"               BIGSERIAL      NOT NULL,
  "player_id"        UUID           NOT NULL,
  -- El proveedor nunca manda hora, y un fichaje no la tiene.
  "fecha"            DATE           NOT NULL,
  "entra_a_team_id"  UUID,
  "entra_a_nombre"   TEXT           NOT NULL,
  "sale_de_team_id"  UUID,
  "sale_de_nombre"   TEXT           NOT NULL,
  -- traspaso | prestamo | vuelve-de-prestamo | libre | desconocido
  "clase"            TEXT           NOT NULL,
  -- Lo que costó, tal cual lo escribió el proveedor y con su moneda; casi siempre no lo dice.
  "monto"            TEXT,
  "actualizado_en"   TIMESTAMPTZ(3) NOT NULL DEFAULT now(),

  CONSTRAINT "transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "transfers_player_id_fkey" FOREIGN KEY ("player_id")
    REFERENCES "players" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- Los clubes se ponen en null en vez de borrar el pase: el movimiento pasó igual.
  CONSTRAINT "transfers_entra_a_team_id_fkey" FOREIGN KEY ("entra_a_team_id")
    REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "transfers_sale_de_team_id_fkey" FOREIGN KEY ("sale_de_team_id")
    REFERENCES "teams" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- El mismo pase llega dos veces: una al pedir el club que lo compró y otra al pedir el que lo
-- vendió. Los nombres desempatan y no los ids, porque el club de afuera muchas veces no tiene uno.
CREATE UNIQUE INDEX "fichaje_unico"
  ON "transfers" ("player_id", "fecha", "entra_a_nombre", "sale_de_nombre");

-- Las dos preguntas de la vista de equipo, cada una con su índice: a quién trajo y a quién dejó ir,
-- lo más nuevo primero. Son dos consultas y no un OR sobre las dos columnas justamente para que
-- cada una entre por su índice en lugar de combinar dos mapas de bits.
CREATE INDEX "transfers_entra_a_team_id_fecha_idx" ON "transfers" ("entra_a_team_id", "fecha" DESC);
CREATE INDEX "transfers_sale_de_team_id_fecha_idx" ON "transfers" ("sale_de_team_id", "fecha" DESC);
-- Y el historial de un futbolista, para su ficha.
CREATE INDEX "transfers_player_id_fecha_idx" ON "transfers" ("player_id", "fecha" DESC);
