-- La entidad entrenador.
--
-- El dato estaba desde siempre y nunca fue nada: cada alineación guarda un `coach_name` suelto que
-- se imprime como texto muerto en tres pantallas. No hay página, no se puede hacer clic, no se
-- puede buscar.
--
-- La identidad es el id del proveedor, que **ya viaja en cada respuesta de alineación** y hasta hoy
-- se descartaba en el mapeador. Sin él los 4.281 nombres distintos de `match_lineups` no se podrían
-- reconciliar nunca: "F. Navarro" aparece con cinco equipos y no hay forma de saber si es una
-- persona que cambió de club o cinco Navarros.
--
-- `match_lineups.coach_name` se queda. Es el respaldo cuando el proveedor no manda id, y una
-- pregunta de 60 Segundos verifica contra ese campo.

CREATE TABLE coaches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  full_name    text,
  slug         text NOT NULL,
  birth_date   date,
  birth_place  text,
  nationality  text,
  photo_url    text,
  relevancia   integer NOT NULL DEFAULT 0,
  created_at   timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   timestamp(3) NOT NULL
);

CREATE UNIQUE INDEX coaches_slug_key ON coaches (slug);
CREATE INDEX coaches_name_idx ON coaches (name);

-- Las etapas vienen del proveedor con sus fechas reales, no deducidas de los partidos que tenemos:
-- un entrenador dirigió mucho antes de que existiera nuestra base.
CREATE TABLE coach_spells (
  id             bigserial PRIMARY KEY,
  coach_id       uuid NOT NULL REFERENCES coaches (id) ON DELETE CASCADE,
  team_id        uuid REFERENCES teams (id),
  team_nombre    text,
  desde          date NOT NULL,
  hasta          date,
  actualizado_en timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX etapa_unica ON coach_spells (coach_id, team_nombre, desde);
CREATE INDEX coach_spells_team_id_desde_idx ON coach_spells (team_id, desde DESC);
CREATE INDEX coach_spells_coach_id_desde_idx ON coach_spells (coach_id, desde DESC);

ALTER TABLE match_lineups ADD COLUMN coach_id uuid REFERENCES coaches (id);
-- La vista del entrenador pregunta justo esto: sus partidos, del más nuevo al más viejo.
CREATE INDEX match_lineups_coach_id_idx ON match_lineups (coach_id);

-- Los mismos dos índices de expresión que tienen equipos, jugadores y competencias para que el
-- buscador encuentre "guardiola" sin acentos y por prefijo. Van en SQL crudo porque Prisma no sabe
-- declarar índices sobre una expresión.
CREATE INDEX coaches_nombre_trgm_idx ON coaches USING gin (immutable_unaccent(lower(name)) gin_trgm_ops);
CREATE INDEX coaches_nombre_prefijo_idx ON coaches (immutable_unaccent(lower(name)) text_pattern_ops);
