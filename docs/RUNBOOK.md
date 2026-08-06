# Runbook de operación

Cómo levantar, verificar y diagnosticar Athena. Pensado para retomar el proyecto
después de semanas sin tocarlo.

## Levantar el entorno local

```bash
./infra/dev-stack.sh          # Redis + API (:3001) + worker + web (:4321)
./infra/dev-stack.sh --stop   # detiene los tres procesos
```

Los logs quedan en `.logs/{api,worker,web}.log`. Si un proceso no arranca, el
script corta a los 30 s y muestra las últimas líneas de su log.

**No sobrevive a un reinicio de WSL**: hay que volver a ejecutarlo.

Node se instala vía nvm; si `node` no se encuentra:

```bash
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
```

## Verificar antes de publicar

```bash
pnpm run verify   # lint (incluye reglas de arquitectura) + typecheck + tests + build
```

Es el mismo comando que corre el CI. Si esto pasa en local, el código está sano
aunque GitHub Actions falle por su cuenta.

### Tests end-to-end

```bash
./infra/dev-stack.sh                    # necesitan el stack arriba y datos reales
pnpm --filter @athena/web e2e
```

La primera vez, el navegador necesita librerías del sistema (una sola vez, pide sudo):

```bash
cd apps/web && sudo -E env "PATH=$PATH" pnpm exec playwright install-deps chromium
```

## Datos

| Tarea | Comando | Costo aproximado |
|---|---|---|
| Competencias, equipos, fixtures, tabla | `pnpm --filter @athena/api sync:bootstrap` | ~50 requests |
| Eventos, estadísticas y alineaciones faltantes | `pnpm --filter @athena/api backfill:matches` | 3 requests por partido |
| Flags, plantillas, embeddings, insights, previas | `pnpm --filter @athena/api ai:bootstrap [pasos]` | ver abajo |

Pasos de `ai:bootstrap` (sin argumentos corre todos): `flags`, `squads`, `events`,
`detail`, `previews`, `embeddings`, `insights`.

El worker mantiene los datos frescos solo: `live-tick` cada 60 s (solo llama al
proveedor si la base indica que puede haber fútbol en juego), `process-outbox`
cada 30 s y `daily-refresh` a las 05:00 UTC.

### Migraciones

```bash
cd packages/database
pnpm exec prisma migrate dev --create-only --name lo_que_cambia   # crear
pnpm exec prisma migrate deploy                                   # aplicar
```

**Nunca `prisma migrate reset`**: borra los datos reales. Supabase preinstala
extensiones que Prisma ve como drift, así que las migraciones se escriben a mano
y se aplican con `deploy`, no con `dev`.

## Presupuestos

Los dos proveedores externos tienen tope y ambos se consultan igual:

```bash
curl -s -H "x-apisports-key: $API_FOOTBALL_KEY" https://v3.football.api-sports.io/status
```

- **API-Football**: la cuenta es compartida con otros sistemas, así que el
  presupuesto se calcula con el `remaining` real de los headers, nunca con el
  límite del plan. Vive en Redis (`athena:budget:apifootball:*`).
- **OpenAI**: tope diario propio de tokens en `OPENAI_DAILY_TOKEN_CAP`
  (2.000.000 por defecto). Al alcanzarlo, los jobs de IA fallan a propósito en
  lugar de seguir gastando.

## Apagar funcionalidad sin desplegar

Los feature flags viven en la tabla `feature_flags` y se cachean 45 s en Redis:

```sql
UPDATE feature_flags SET enabled = false WHERE key = 'ai_insights';
```

Claves: `ai_insights`, `semantic_search`, `live_match_center`, `recommendations`.
`GET /v1/config` devuelve el estado actual.

## Diagnóstico

| Síntoma | Dónde mirar |
|---|---|
| Los datos no se actualizan | `.logs/worker.log`; que exista un solo worker; que Redis esté arriba |
| Un job falla siempre | Busca `job_failed` en el log: trae job, intentos y error |
| Un 500 en la web | La respuesta trae `requestId`; búscalo en `.logs/api.log` |
| Partidos sin estadísticas | Normal si son viejos: corre `backfill:matches` |
| Sin insights nuevos | Revisa el flag `ai_insights` y el tope de tokens |
| Previa ausente en un partido | Esperado si no hay tabla, historial ni forma previa: se omite a propósito |
| Login devuelve 403 | `security.allowedDomains` en `astro.config.mjs` debe incluir el dominio real |
| La web dice que falta configurar Supabase | Las variables `PUBLIC_*` se compilan: hay que reconstruir tras cambiarlas |

Con `SENTRY_DSN` configurado, los errores 5xx y los jobs fallidos se reportan
automáticamente; sin él, todo queda en los logs estructurados.

## Estado del proyecto

Fases 0 a 6 completas. Pendientes conocidos:

- Rediseño visual completo de la web (pedido explícito, siguiente gran tarea).
- Módulo `media`: espejar logos y fotos del proveedor a Supabase Storage.
- Estadísticas por jugador y temporada (`/players` del proveedor).
- Recomendaciones personalizadas (flag `recommendations`, aún apagado).
- Decidir hosting de producción; el diseño no asume ninguno.
