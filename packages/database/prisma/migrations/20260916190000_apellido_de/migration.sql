-- Dos ayudas para reconocer que dos escrituras nombran a la misma persona.
--
-- El proveedor escribe al mismo entrenador de tres formas según dónde se lo pregunte: "Guardiola"
-- en la ficha, "Pep Guardiola" en una alineación de la Premier y "Josep Guardiola i Sala" en una
-- del Mundial de Clubes. Comparar la última palabra falla en la tercera, donde el apellido queda
-- en el medio, así que se busca el apellido de un nombre entre las palabras del otro.
--
-- Van como funciones y no inline porque la condición aparece en el amarre de alineaciones y se lee
-- mucho mejor así. Inmutables para poder indexarlas más adelante si hiciera falta.

CREATE OR REPLACE FUNCTION palabras_de(nombre text) RETURNS text[]
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT string_to_array(immutable_unaccent(lower(btrim(nombre))), ' ')
$$;

CREATE OR REPLACE FUNCTION apellido_de(nombre text) RETURNS text
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
  SELECT regexp_replace(immutable_unaccent(lower(btrim(nombre))), '^.*\s', '')
$$;
