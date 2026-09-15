-- El catálogo de 60 Segundos.
--
-- Propio y sin referencia a `matches`, por la misma razón que los otros dos juegos: Athena no tiene
-- los partidos viejos —de la Champions guarda alineaciones desde 2021, del Mundial solo 2026— y
-- apoyarse en ellos obligaría a importar mundiales enteros para alimentar un juego. Lo único que
-- apunta a `players` es la foto de las preguntas de «¿quién es?», para que el retrato siga al
-- futbolista si se corrige.

CREATE TABLE preguntas_de_60 (
  id             bigserial PRIMARY KEY,
  clave          text NOT NULL UNIQUE,
  tipo           text NOT NULL,
  dificultad     text NOT NULL,
  enunciado      text NOT NULL,
  explicacion    text NOT NULL,
  -- La escena: dos preguntas de lo mismo no salen pegadas en la misma tanda.
  contexto       text NOT NULL DEFAULT '',
  -- Verdadero cuando el proveedor no cubre el dato y la verdad la respalda el editor.
  validado_a_mano boolean NOT NULL DEFAULT false,
  -- Solo en `quien-es`: el futbolista cuya foto ES la pregunta.
  player_id      uuid REFERENCES players(id),
  foto_ref       text,
  -- Escudos, banderas o logos que acompañan al enunciado, ya resueltos a URL.
  emblemas       text[] NOT NULL DEFAULT '{}',
  actualizado_en timestamptz(3) NOT NULL DEFAULT now()
);

CREATE TABLE opciones_de_60 (
  id          bigserial PRIMARY KEY,
  pregunta_id bigint NOT NULL REFERENCES preguntas_de_60(id) ON DELETE CASCADE,
  texto       text NOT NULL,
  es_correcta boolean NOT NULL
);

CREATE INDEX opciones_de_60_pregunta ON opciones_de_60 (pregunta_id);
