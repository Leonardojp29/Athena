-- Los colores del equipo, tal como los publica el proveedor en las alineaciones.
--
-- No cuestan un request nuevo: /fixtures/lineups ya se pide para dibujar la cancha y trae
-- `team.colors.player.primary` y `.number`. Se guardan como hex sin almohadilla, que es como
-- llegan, y la interfaz decide el contraste: varios son casi blancos.
ALTER TABLE "teams"
  ADD COLUMN IF NOT EXISTS "primary_color" TEXT,
  ADD COLUMN IF NOT EXISTS "secondary_color" TEXT;
