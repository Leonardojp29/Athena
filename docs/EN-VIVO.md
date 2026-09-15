# El vivo

Cuánto tarda un gol en llegar a la pantalla, y por qué.

## La cadena

| Salto | Cada | Cuesta |
|---|---|---|
| El proveedor refresca su feed | **20 s** (medido) | — |
| `athena-marcador` late y escribe la base | **15 s** | 1 pedido |
| `GET /views/marcadores` se recalcula | 5 s | 1 consulta |
| El navegador pide `/marcadores.json` | **15 s** | ~800 B |

**Del estadio a la pantalla: mediana 20 s hasta la vista, ~27 s típicos en la pantalla.**
Antes eran minutos en local e infinito en producción, donde el cron llevaba horas devolviendo 404.

No tiene sentido bajar de 15 s: el proveedor no publica más seguido, y pedir cada 10 s sería gastar
cuota mirando lo mismo.

## Por qué el marcador va aparte del resto

El tic del sync hace lo pesado —alineaciones, estadísticas, cierre de partidos, cola de tareas— y no
entra en un minuto ni queriendo. Mientras el marcador viajaba en ese paquete, heredaba su ritmo.

`SyncMarcadorUseCase.latir()` hace solo lo perecedero: un pedido al feed, un diff contra lo que hay
en la base, y una escritura en lote de lo que cambió. Con cero partidos en juego no gasta ni un
pedido. El tic conserva `syncLive` como respaldo y lo corre solo si el latido lleva más de noventa
segundos sin dar señales.

## Las tres cosas que pueden pisarse, y cómo se evitan

**Dos escritores con fotos distintas.** El latido, la reconciliación y el refresco diario escriben
las mismas columnas. Todos pasan por `escribirSiEsMasNuevo`, que descarta la fila si alguien la tocó
después del instante en que se recibió la respuesta del proveedor.

**Dos veces el mismo final.** `cerrarPartidosYPublicar` cierra y publica `MATCH_FINISHED` en una sola
sentencia, con `WHERE status <> 'finished' RETURNING id`. El segundo escritor reevalúa la condición
sobre la fila ya cerrada y no devuelve nada.

**Eventos duplicados.** `MatchEventWriter` reemplaza el set completo con `DELETE` + `INSERT`; dos
reemplazos a la vez dejan los goles por duplicado. Mientras el partido se juega, los eventos son del
latido; el barrido de cierre los escribe recién en la fase final.

## El entretiempo

`reconcileStale` da por terminado un partido que lleva diez minutos sin que nadie toque su fila. En
el entretiempo el marcador no cambia durante quince minutos, así que el latido sella `updated_at` de
todo lo que ve en el feed aunque no haya cambiado nada: `updated_at` significa «visto vivo», no
«cambió».

## Lo que el navegador pide

`/marcadores.json` trae solo lo que está en juego más lo que terminó hace menos de quince minutos:
id, estado, minuto y goles. Antes cada página pedía la vista del día —163 KB, de los que el refresco
usaba 4— **una vez por cada día en pantalla**: en la página de un equipo, hasta veinte pedidos cada
treinta segundos.

`generadoEn` viaja con la respuesta porque el borde puede servir una más vieja que la ya pintada; el
navegador descarta cualquiera que no sea posterior a la última aplicada.

La página de partido usa el mismo latido para el marcador y el minuto, y solo vuelve a pedir la
vista completa de 53 KB cuando el latido dice que algo cambió.

## Verificar

```bash
curl -s localhost:3001/v1/views/marcadores | head -c 300
curl -s -H "x-cron-secreto: $CRON_SECRET" localhost:3001/v1/internal/salud
```

En producción, lo que vale no es si el cron disparó sino qué contestó el API:

```sql
select status_code, content::text, created
from net._http_response order by created desc limit 5;
```
