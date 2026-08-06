-- `createMany({ skipDuplicates: true })` sobre entity_relationships no deduplicaba nada:
-- sin índice único no hay conflicto que saltar, así que cada corrida del sync de plantillas
-- agregaba otra fila "played_for" idéntica. Se limpian las repetidas y se cierra la puerta.

DELETE FROM "entity_relationships" e
USING "entity_relationships" otra
WHERE e.ctid > otra.ctid
  AND e.from_type = otra.from_type
  AND e.from_id = otra.from_id
  AND e.relation = otra.relation
  AND e.to_type = otra.to_type
  AND e.to_id = otra.to_id;

CREATE UNIQUE INDEX "entity_relationships_edge_key"
    ON "entity_relationships"("from_type", "from_id", "relation", "to_type", "to_id");
