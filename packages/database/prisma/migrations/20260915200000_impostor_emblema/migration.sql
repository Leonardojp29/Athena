-- Todo enunciado nombra un equipo —«los titulares del PSG», «la lista de Perú»— y el catálogo ya lo
-- tiene fijado por id. Mostrarlo al costado ahorra leer el nombre para ubicarse, que en una ronda
-- contra reloj es tiempo que se gasta en lo que no es el juego.
--
-- Escudo para los clubes y bandera para las selecciones: el proveedor no sirve para lo segundo
-- porque devuelve la bandera de Argentina pero el sello de la FPF para Perú. La regla vive en el
-- catálogo y acá llega ya resuelta.

ALTER TABLE retos_del_impostor ADD COLUMN emblema_url text;
