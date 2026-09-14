-- Un pase puede no tener club de un lado.
--
-- Cuando alguien queda libre, el proveedor escribe el nombre del propio futbolista como si fuera el
-- club de destino: "Mohamed Salah → Salah Mohamed". Son 213 filas y todas dicen `libre`. Y al revés,
-- un jugador que llega sin contrato trae su propio nombre como club de origen.
--
-- El modelo honesto es que el otro lado pueda no existir: null significa "quedó sin club", que es
-- distinto de "no sabemos a dónde fue".
ALTER TABLE "transfers" ALTER COLUMN "entra_a_nombre" DROP NOT NULL;
ALTER TABLE "transfers" ALTER COLUMN "sale_de_nombre" DROP NOT NULL;
