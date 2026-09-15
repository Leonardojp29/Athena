-- Un futbolista sin títulos y uno que todavía no se le preguntó al proveedor se veían iguales:
-- las dos cosas son "no tiene filas en player_trophies". Así el relleno volvía a preguntar por los
-- mismos miles en cada corrida —la máquina se reinició dos veces a mitad— y la cuenta de pendientes
-- nunca podía llegar a cero.
--
-- La marca dice cuándo se preguntó, que es distinto de qué contestaron.

ALTER TABLE players ADD COLUMN palmares_revisado_en timestamptz(3);

-- A quien ya tiene títulos se le preguntó, por definición: se da por revisado y no se repregunta.
UPDATE players p SET palmares_revisado_en = now()
WHERE EXISTS (SELECT 1 FROM player_trophies t WHERE t.player_id = p.id);

-- El relleno solo busca los que faltan, así que el índice solo necesita cubrir esos. Parcial, que
-- sobre cuarenta y seis mil fichas es una fracción del tamaño del índice completo.
CREATE INDEX players_palmares_pendiente ON players (id) WHERE palmares_revisado_en IS NULL;
