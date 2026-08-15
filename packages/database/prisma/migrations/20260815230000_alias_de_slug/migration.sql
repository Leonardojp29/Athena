-- Los slugs viejos, para que un enlace compartido nunca muera.
--
-- Un slug se puede tener que cambiar por dos razones: el jugador nació de una alineación abreviada y
-- quedó como "j-alarcon" hasta que llegó su nombre completo, o el equipo se guardó con el nombre en
-- inglés del proveedor —"spain"— y pasó a llamarse como se lo llama acá. Las dos cosas ya pasaron:
-- hay 6 089 jugadores abreviados y 135 selecciones renombradas.
--
-- Cambiar el slug sin esta tabla convierte en 404 cualquier enlace que alguien haya compartido, así
-- que el viejo queda apuntando a la entidad y la página responde con una redirección permanente.
CREATE TABLE IF NOT EXISTS "slug_aliases" (
  "entity_type" TEXT NOT NULL,
  "slug"        TEXT NOT NULL,
  "entity_id"   UUID NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slug_aliases_pkey" PRIMARY KEY ("entity_type", "slug")
);

-- Para limpiar los alias de una entidad cuando se la borra o se la vuelve a renombrar.
CREATE INDEX IF NOT EXISTS "slug_aliases_entity_idx" ON "slug_aliases" ("entity_type", "entity_id");
