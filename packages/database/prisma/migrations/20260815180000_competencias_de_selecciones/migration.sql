-- Un torneo de selecciones no es un torneo de clubes, y la navegación tiene que poder separarlos.
--
-- El Mundial, las eliminatorias y la Copa América llegan del proveedor igual que la Libertadores:
-- sin país —"World" se normaliza a null— y con formato copa. Nada en la fila los distingue, y sin
-- distinguirlos terminarían mezclados con las copas de clubes de cada confederación, que es
-- exactamente lo contrario de lo que busca quien entra a ver a su selección.
--
-- `clubs` por defecto: las 61 competencias que ya existen son todas de clubes.
ALTER TABLE "competitions"
  ADD COLUMN IF NOT EXISTS "scope" TEXT NOT NULL DEFAULT 'clubs';

COMMENT ON COLUMN "competitions"."scope" IS 'clubs | national: de clubes o de selecciones';

-- El catálogo se arma filtrando por ámbito y ordenando por continente: se consultan juntos.
CREATE INDEX IF NOT EXISTS "competitions_scope_continent_idx"
  ON "competitions" ("scope", "continent");
