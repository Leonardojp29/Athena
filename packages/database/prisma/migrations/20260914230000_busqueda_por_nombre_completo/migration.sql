-- La búsqueda solo miraba `players.name`, donde el proveedor guarda "L. Messi", y nunca
-- `players.full_name`, donde guarda "Lionel Andrés Messi Cuccittini". Escribir el nombre de pila
-- no encontraba a nadie, y Adivina el XI vive de que el hincha escriba el nombre que recuerda.
--
-- El mismo par que ya tiene `name`: el GIN de trigramas para lo que se parece y el btree de patrón
-- para el prefijo, que es la forma que tiene una consulta mientras se escribe.

CREATE INDEX "players_full_name_busqueda_idx" ON "players"
  USING gin (immutable_unaccent(lower("full_name")) gin_trgm_ops);

CREATE INDEX "players_full_name_prefijo_idx" ON "players"
  (immutable_unaccent(lower("full_name")) text_pattern_ops);

-- Igual que los seis de `20260911170000_busqueda_sin_acentos` y `20260911170500_busqueda_por_prefijo`:
-- son índices de expresión y Prisma no los puede declarar en el schema, así que `migrate dev` los
-- vería como deriva. Se tocan solo desde acá.
