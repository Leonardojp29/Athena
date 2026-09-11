-- El trigram no sirve para consultas de una o dos letras: "u" no tiene trigramas y la búsqueda
-- caía en Seq Scan de 471 ms. Un btree de patrón resuelve el prefijo a cualquier largo, que es
-- justo la forma que tiene una consulta mientras se escribe.
CREATE INDEX "teams_name_prefijo_idx"
  ON "teams" (immutable_unaccent(lower("name")) text_pattern_ops);
CREATE INDEX "players_name_prefijo_idx"
  ON "players" (immutable_unaccent(lower("name")) text_pattern_ops);
CREATE INDEX "competitions_name_prefijo_idx"
  ON "competitions" (immutable_unaccent(lower("name")) text_pattern_ops);

-- Estos seis índices son de expresión y Prisma no los puede declarar en el schema: `migrate dev`
-- los vería como deriva. Se tocan solo desde acá.
