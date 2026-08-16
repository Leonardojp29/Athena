# ADR-005 — Sync serverless: Postgres como cola y estado, sin Redis

**Estado**: Aceptada · **Fecha**: 2026-08-16 · **Reemplaza**: ADR-004

## Problema

El despliegue objetivo es Vercel (funciones serverless) + Supabase, a costo cero. Ahí no
existe un proceso encendido: no hay dónde correr un worker de BullMQ ni conviene pagar un
Redis administrado solo para cola, caché y contadores. Y el requisito no negociable es que
**todo el vivo funcione igual que en local** desde el lanzamiento.

## Decisión

Cada uso de Redis se reemplaza por el equivalente exacto en lo que ya tenemos:

- **Cola de trabajos** → tabla `tareas` en Postgres. Los consumidores toman con
  `FOR UPDATE SKIP LOCKED` (varias instancias no chocan), con prioridad, `corre_despues`
  para los diferidos, backoff exponencial (5 s · 2^intentos) y tope de 3 intentos.
- **Estado compartido chico** (presupuesto de cuota, cooldowns, contador de tokens de IA)
  → tabla `kv` (clave, numero, vence_en). El `SET NX EX` de Redis es un
  `INSERT ... ON CONFLICT ... WHERE vence_en <= now() RETURNING`. El presupuesto lee de un
  espejo en memoria y persiste cada 5 s: la exactitud la dan los headers reales del
  proveedor en cada respuesta, no el contador.
- **Caché puro** (vistas compuestas, feature flags, embeddings de búsqueda) → memoria del
  proceso con TTL (`Memoria`, un Map acotado). En serverless cada instancia calienta la
  suya; los TTL ya eran de segundos, así que la ventana de inconsistencia no cambia.
- **El latido** → un solo método `tick(presupuestoMs)`: hace lo urgente del vivo, drena el
  outbox y consume la cola hasta agotar su presupuesto de tiempo. En local lo dispara el
  bucle de `main.worker.ts` cada 60 s; en producción, **pg_cron + pg_net de Supabase**
  llaman `POST /v1/internal/tick` cada minuto (autenticado con `x-cron-secreto`). Un solo
  camino de código para las dos formas de correr.
- Lo diario tiene su cron a las 05:00 y además el tic recupera lo atrasado (>24 h) por si
  el cron no se disparó.

## Trade-offs

- (+) Cero infraestructura extra: la base que ya pagamos (gratis) es cola, estado y candado.
- (+) La cola es consultable con SQL y sobrevive a cualquier reinicio o despliegue.
- (+) Imposible repetir el accidente del FLUSHDB: no hay comando que borre la cola por accidente.
- (−) El tic vive de un cron externo: si pg_cron se detiene, el sync se detiene (mitigado:
  el endpoint recupera atrasados en cuanto vuelve, y el bucle local sigue existiendo).
- (−) La caché por instancia repite algún cálculo entre funciones frías; con TTL de
  segundos y vistas baratas, es ruido.
