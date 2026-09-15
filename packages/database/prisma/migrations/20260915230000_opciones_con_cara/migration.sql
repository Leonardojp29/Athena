-- La cara de cada opción: la foto del futbolista, el escudo del club o la bandera del país.
--
-- Con cuatro nombres escritos, cincuenta preguntas se ven iguales por más que el enunciado cambie.
-- Con la cara, «¿quién ganó la Champions 2019?» se contesta reconociendo un escudo, que es como se
-- lee el fútbol.
--
-- O la llevan todas las opciones de una pregunta o no la lleva ninguna: tres retratos y un cuadro
-- vacío señalan la respuesta con el dedo. Eso lo decide la importación y acá llega ya resuelto.

ALTER TABLE opciones_de_60 ADD COLUMN imagen text;
