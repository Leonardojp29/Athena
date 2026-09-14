-- La cola llegó a 70.606 tareas de las que solo 2.609 eran distintas: el mismo partido encolado
-- hasta 236 veces. `encolar` insertaba sin mirar, y mientras el drenado estuvo en cero cada
-- refresco diario volvía a apilar lo mismo.
--
-- Una tarea se borra al completarse, así que toda fila viva es trabajo pendiente: la unicidad
-- sobre (tipo, datos) dice exactamente "no pidas dos veces lo mismo a la vez". jsonb normaliza el
-- orden de las claves, así que dos objetos iguales comparan iguales.
--
-- De las repetidas sobrevive la de menor id, que es la más vieja y la que ya esperó su turno.

DELETE FROM tareas t
USING tareas anterior
WHERE t.tipo = anterior.tipo
  AND t.datos = anterior.datos
  AND t.id > anterior.id;

CREATE UNIQUE INDEX tarea_unica ON tareas (tipo, datos);
