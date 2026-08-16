# Runbook de operación

Cómo levantar, verificar y diagnosticar Athena. Pensado para retomar el proyecto
después de semanas sin tocarlo.

## Levantar el entorno local

```bash
./infra/dev-stack.sh          # API (:3001) + worker + web (:4321)
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

La primera vez, el navegador necesita librerías del sistema. Se instalan una sola
vez y piden la contraseña de tu usuario de WSL:

```bash
sudo apt-get update
sudo apt-get install -y at-spi2-common at-spi2-core fonts-freefont-ttf fonts-ipafont-gothic fonts-liberation fonts-noto-color-emoji fonts-tlwg-loma-otf fonts-unifont fonts-wqy-zenhei libasound2-data libasound2t64 libatk-bridge2.0-0t64 libatk1.0-0t64 libatspi2.0-0t64 libfontenc1 libice6 libnspr4 libnss3 libsm6 libunwind8 libxaw7 libxfont2 libxkbfile1 libxmu6 libxpm4 libxt6t64 x11-xkb-utils xfonts-cyrillic xfonts-encodings xfonts-scalable xfonts-utils xserver-common xvfb
```

Para reconfirmar qué falta en cualquier momento (no instala nada):

```bash
pnpm --filter @athena/web exec playwright install-deps --dry-run chromium
```

## Datos

| Tarea | Comando | Costo aproximado |
|---|---|---|
| Competencias, equipos, fixtures, tabla | `pnpm --filter @athena/api sync:bootstrap` | ~50 requests |
| Eventos, estadísticas y alineaciones faltantes | `pnpm --filter @athena/api backfill:matches` | 3 requests por partido |
| Bios, acumulados de temporada, plantillas y dorsales | `FASE=temporadas pnpm --filter @athena/api backfill:players` | ~30 requests por liga |
| Rendimiento por jugador de cada partido | `FASE=partidos pnpm --filter @athena/api backfill:players` | 1 request por partido |
| Revincular alineaciones con los jugadores que existen hoy | `pnpm --filter @athena/api relink:lineups` | 0 requests |
| Flags, plantillas, embeddings, insights, previas | `pnpm --filter @athena/api ai:bootstrap [pasos]` | ver abajo |

Pasos de `ai:bootstrap` (sin argumentos corre todos): `flags`, `squads`, `events`,
`detail`, `previews`, `embeddings`, `insights`.

**El orden de `backfill:players` importa.** `temporadas` primero: trae el nombre completo y
de ahí sale el slug, que se asigna una sola vez y no se cambia nunca porque es una URL. Si
el jugador nace de `partidos`, queda como `j-alarcon` para siempre. Sin `FASE` corre las dos
en el orden correcto.

`relink:lineups` se corre **después** de las dos fases: mete el `playerId`, el `slug` y la
foto dentro del JSONB de la alineación, que es lo que hace clickeable cada jugador de la
cancha. No gasta cuota, así que se puede repetir cuantas veces haga falta.

En agosto las ligas europeas devuelven vacío para la temporada que arranca: `temporadas` cae
sola a la campaña anterior y lo dice en el log.

Un cambio de `MATCH_RECAP_PROMPT_VERSION` o `MATCH_PREVIEW_PROMPT_VERSION` hace que el
siguiente `ai:bootstrap insights` regenere los análisis ya publicados. Subir la versión es la
forma de decir "esto hay que volver a escribir".

El worker mantiene los datos frescos solo: `live-tick` cada 60 s (solo llama al
proveedor si la base indica que puede haber fútbol en juego), `process-outbox`
cada 30 s y `daily-refresh` a las 05:00 UTC.

**Esa cadencia vive en la tabla `sync_schedules`, no en el código.** Se siembra sola en el
primer arranque del worker y se relee en cada arranque:

| Columna | Para qué |
|---|---|
| `cron` | patrón de cinco campos, para lo que se puede expresar en cron |
| `metadata.everyMs` | intervalos que cron no puede decir (30 s), en milisegundos |
| `metadata.tz` | zona del patrón; sin ella, UTC |
| `enabled` | en `false` el recurrente deja de dispararse en el siguiente tic |
| `last_run_at` | lo sella el propio job: es la forma de ver si un recurrente dejó de correr |

Exactamente uno de `cron` o `metadata.everyMs`. Una fila sin ninguno, o con un `job_kind` que
este worker no sabe ejecutar, se omite con un warning: una cadencia mal escrita no apaga el
worker. Si la base no responde al arrancar, cae a la cadencia por defecto — un worker que no
levanta por no poder leer una cadencia es peor que uno con la de fábrica.

Cambiar una cadencia es un `UPDATE` y reiniciar el worker; no requiere desplegar.

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
  límite del plan. Vive en la tabla `kv` (`presupuesto:apifootball:*`), con un
  espejo en memoria para no pagar una consulta por request.
- **OpenAI**: tope diario propio de tokens en `OPENAI_DAILY_TOKEN_CAP`
  (2.000.000 por defecto). Al alcanzarlo, los jobs de IA fallan a propósito en
  lugar de seguir gastando.

## Cola y caché: dónde vive cada cosa

No hay Redis. La cola de trabajos es la tabla `tareas` de Postgres (los workers
toman con `FOR UPDATE SKIP LOCKED`, así varias instancias no chocan), el estado
compartido chico —presupuestos, cooldowns— es la tabla `kv`, y la caché de
vistas es memoria del proceso con TTL corto. Borrar caché es reiniciar el
proceso; la cola y los presupuestos no se pueden borrar por accidente porque
son filas en la base.

**El latido del sync es `tick()`** y corre por dos caminos que son el mismo
código: en local, el bucle de `main.worker.ts` cada 60 s; en Vercel, pg_cron de
Supabase llama `POST /v1/internal/tick` cada minuto con el header
`x-cron-secreto: $CRON_SECRET`. Ver `docs/DEPLOY.md`.

```bash
# mirar la cola
psql "$DIRECT_URL" -c "SELECT tipo, count(*) FROM tareas GROUP BY 1"
# disparar un tic a mano
curl -X POST -H "x-cron-secreto: $CRON_SECRET" http://localhost:3001/v1/internal/tick
```

## Apagar funcionalidad sin desplegar

Los feature flags viven en la tabla `feature_flags` y se cachean 45 s en memoria:

```sql
UPDATE feature_flags SET enabled = false WHERE key = 'ai_insights';
```

Claves: `ai_insights`, `semantic_search`, `live_match_center`, `recommendations`.
`GET /v1/config` devuelve el estado actual.

## Diagnóstico

| Síntoma | Dónde mirar |
|---|---|
| Los datos no se actualizan | `.logs/worker.log` (o el cron de Supabase en producción); que el tic corra cada minuto |
| Faltan alineaciones o estadísticas de partidos recientes | Que la cola tenga trabajos (`SELECT count(*) FROM tareas`); el tic recupera lo terminado en las últimas seis horas |
| Un job falla siempre | Busca `job_failed` en el log: trae job, intentos y error |
| Un 500 en la web | La respuesta trae `requestId`; búscalo en `.logs/api.log` |
| Partidos sin estadísticas | Normal si son viejos: corre `backfill:matches` |
| Sin insights nuevos | Revisa el flag `ai_insights` y el tope de tokens |
| Previa ausente en un partido | Esperado si no hay tabla, historial ni forma previa: se omite a propósito |
| Login devuelve 403 | `security.allowedDomains` en `astro.config.mjs` debe incluir el dominio real |
| La web dice que falta configurar Supabase | Las variables `PUBLIC_*` se compilan: hay que reconstruir tras cambiarlas |
| Todo se siente lento en local | Cada consulta viaja a Supabase (~800 ms por round-trip desde fuera de us-west-2). No es el código: en producción, con el API en la región de la base, son milisegundos. Mídelo con un `SELECT 1` antes de optimizar |

Con `SENTRY_DSN` configurado, los errores 5xx y los jobs fallidos se reportan
automáticamente; sin él, todo queda en los logs estructurados.

## Estado del proyecto

Fases 0 a 6 completas. Pendientes conocidos:

- Rediseño visual completo de la web (pedido explícito, siguiente gran tarea).
- Módulo `media`: espejar logos y fotos del proveedor a Supabase Storage.
- Estadísticas por jugador y temporada (`/players` del proveedor).
- Recomendaciones personalizadas (flag `recommendations`, aún apagado).
- Decidir hosting de producción; el diseño no asume ninguno.
