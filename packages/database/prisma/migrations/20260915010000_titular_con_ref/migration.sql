-- El buscador de Adivina el XI tardaba casi un segundo por consulta, y era todo viaje a la base:
-- la consulta en sí resuelve en 73 ms y el resto es la ida y vuelta a otra región. Para bajar de
-- los 100 ms hay que no ir, así que el navegador se lleva un índice de futbolistas.
--
-- Ese índice no puede cargar el UUID de cada uno —treinta y seis caracteres contra seis del id del
-- proveedor son trescientos KB de diferencia sobre doce mil fichas—, así que la identidad dentro
-- del juego pasa a ser el `provider_ref`. Acá se denormaliza, como ya se hace con el slug y la foto
-- dentro de las alineaciones: un reto se lee entero y de una sola vez.

ALTER TABLE "titulares_del_reto" ADD COLUMN "provider_ref" TEXT;

UPDATE "titulares_del_reto" t
SET "provider_ref" = r."provider_ref"
FROM "external_references" r
WHERE r."entity_type" = 'player' AND r."provider" = 'api-football' AND r."entity_id" = t."player_id";
