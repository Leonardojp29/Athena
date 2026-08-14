-- La foto del estadio, el tipo de campo y la dirección.
--
-- No cuestan un request nuevo: /teams ya se pide para poblar el catálogo y trae `venue.image`,
-- `venue.surface` y `venue.address` en cada equipo. El mapper los descartaba. El endpoint de
-- partidos manda el estadio pelado —solo id, nombre y ciudad—, así que estos tres campos se
-- escriben con guarda: un fixture no puede borrar lo que trajo el catálogo.
ALTER TABLE "venues"
  ADD COLUMN IF NOT EXISTS "image_url" TEXT,
  ADD COLUMN IF NOT EXISTS "surface" TEXT,
  ADD COLUMN IF NOT EXISTS "address" TEXT;
