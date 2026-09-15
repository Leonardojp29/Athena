-- IMP-024 e IMP-030 son el mismo Brasil-Bélgica de 2018 mirado desde cada lado: uno pregunta por el
-- XI de Brasil y el otro por el de Bélgica. No comparten ninguna carta, así que la regla de "no
-- pongas seguidos dos retos con caras repetidas" no los ve, y salir uno detrás del otro delata que
-- se está mirando el mismo partido.
--
-- El contexto nombra la escena —el partido, o el club y la temporada— y el sorteo se encarga de que
-- dos retos de la misma escena no caigan pegados.

ALTER TABLE retos_del_impostor ADD COLUMN contexto text NOT NULL DEFAULT '';
