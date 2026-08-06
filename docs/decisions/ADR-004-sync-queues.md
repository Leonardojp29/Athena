# ADR-004 — Scheduler/colas para sincronización y derivación

**Estado**: Aceptada · **Fecha**: 2026-08-06

## Problema

Sincronizar API-Football (plan Mega: 150k req/día, 900/min) para ~12 competencias sin agotar cuota, y derivar conocimiento (stats, insights IA, embeddings) sin bloquear nada.

## Decisión

BullMQ sobre Redis con separación estricta **scheduler → cola → worker**:

- **Scheduler** (repeatable jobs): decide QUÉ encolar leyendo estado (partidos de hoy, partidos en juego). Nunca llama al proveedor ni escribe dominio. Cadencias en la tabla `sync_schedules` (datos, no código).
- **Colas por naturaleza**: `sync:reference`, `sync:fixtures`, `sync:live`, `derive:stats`, `derive:insights`, `derive:embeddings` — prioridad y rate-limit por cola.
- **Vivo barato**: `fixtures?live=all` trae todos los partidos en juego en 1 request cada 15-20 s; stats detalladas solo para partidos priorizados. Peor caso estimado: <15k req/día (~10% de la cuota).
- **Idempotencia**: todo job hace upsert vía `external_references`; re-ejecutar nunca duplica.
- **Presupuesto**: contador en Redis alimentado por los headers de cuota del proveedor; el adaptador frena antes del límite.
- **Encadenamiento por eventos**: `MATCH_FINISHED → derive:stats → derive:insights → derive:embeddings` (outbox en `domain_events`).

## Trade-offs

- (+) Reintentos, backoff, observabilidad y aislamiento de carga incluidos en BullMQ.
- (−) Redis se vuelve dependencia dura del plano de sync (no del de lectura: la web sigue sirviendo desde Postgres/cache si Redis cae).
