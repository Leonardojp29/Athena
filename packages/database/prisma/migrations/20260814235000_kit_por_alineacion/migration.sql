-- El color de la camiseta con la que jugó cada equipo, partido por partido.
--
-- El proveedor no publica la paleta del club en ningún endpoint: los únicos colores que manda son
-- los de `/fixtures/lineups`, y son los del kit **de ese partido**. Guardarlos en `teams` como se
-- hacía significaba que el último partido sincronizado ganaba, así que un equipo terminaba pintado
-- con su camiseta de visitante —Real Madrid quedó con su tercera— y la identidad del club cambiaba
-- sola cada fin de semana.
--
-- Acá cada alineación deja su muestra, y la identidad se deduce después: el kit más frecuente de los
-- partidos de local. No cuesta un request nuevo, porque el payload ya se pide para dibujar la cancha.
ALTER TABLE "match_lineups"
  ADD COLUMN IF NOT EXISTS "kit_color" TEXT,
  ADD COLUMN IF NOT EXISTS "kit_number_color" TEXT;

-- Para la moda por equipo: se consulta por equipo y color, filtrando por el local del partido.
CREATE INDEX IF NOT EXISTS "match_lineups_team_kit_idx" ON "match_lineups" ("team_id", "kit_color");
