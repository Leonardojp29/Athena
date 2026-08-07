-- La navegación se ordena continente → país → torneo, y eso tiene que venir de los datos.
-- Antes el continente lo decidía un mapa de nombres de país en el código del API: con doce
-- competencias pasaba, con sesenta es una lista que hay que editar en cada liga nueva.
--
-- `country_code` lo publica el proveedor (PE, GB-ENG); `continent` lo decide el catálogo,
-- porque es una decisión de producto y no un dato del proveedor.

ALTER TABLE "competitions" ADD COLUMN "country_code" TEXT;
ALTER TABLE "competitions" ADD COLUMN "continent" TEXT;

CREATE INDEX "competitions_continent_country_code_idx"
    ON "competitions"("continent", "country_code");
