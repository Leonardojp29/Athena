# API-Football v3 — Referencia técnica (plan Mega)

Verificado contra el spec OpenAPI oficial v3.9.3 (2026-08). Esta es la referencia del adaptador `providers/api-football`. Los modelos del proveedor **nunca** salen del adaptador (ADR-001).

## Acceso

- Canal **directo** (no RapidAPI): base `https://v3.football.api-sports.io/`, header `x-apisports-key: <API_FOOTBALL_KEY>`. Solo GET; no enviar headers extra.
- `GET /status` — **gratis, no consume cuota**: plan, expiración, consumo del día. Usarlo para monitoreo.
- Imágenes en `https://media.api-sports.io/football/{teams|leagues|players|coachs|venues}/{id}.png` y `/flags/{code}.svg`: gratis, fuera de cuota, con rate-limit propio → espejarlas a Supabase Storage/CDN (módulo `media`, Fase 1).

## Cuota (plan Mega)

- **150,000 requests/día · 900/minuto** (~15 req/s; ráfagas se encolan, exceso sostenido → HTTP 429 y posible bloqueo de firewall).
- Todos los endpoints, todas las competencias, todas las temporadas históricas (~2008+ en ligas grandes; verificar `coverage` por liga/temporada).
- Sin sobrecostos: al agotar la cuota el API deja de servir.
- Headers de cuota en cada respuesta: `x-ratelimit-requests-limit` / `x-ratelimit-requests-remaining` (día) y `X-RateLimit-Limit` / `X-RateLimit-Remaining` (minuto) → alimentan el presupuesto en la tabla `kv` (ADR-005).

## Envelope y errores

```json
{ "get": "...", "parameters": {}, "errors": {}, "results": 0, "paging": { "current": 1, "total": 1 }, "response": [] }
```

**Los errores suelen llegar con HTTP 200 dentro de `errors`.** El adaptador valida `errors` y `results`, nunca solo el status HTTP.

Paginación solo en: `/odds` (10/pág), `/odds/mapping` (100/pág), `/players` (20/pág), `/players/profiles` (250/pág) vía `?page=N`.

## Endpoints principales

| Endpoint | Uso en Athena | Cadencia del proveedor |
|---|---|---|
| `/leagues` | Competencias + flags `coverage` por temporada | varias/día |
| `/teams`, `/venues`, `/coachs` | Referencia | semanal |
| `/players/profiles`, `/players/squads` | Bios y plantillas | semanal |
| `/players?league&season` | Stats de temporada por jugador | diaria |
| `/fixtures` | Calendario/resultados (por `date`, `league+season`, `ids=a-b-c`) | 15 s |
| `/fixtures?ids=` | **Verificado 2026-09-11**: devuelve `events`, `lineups`, `statistics` y `players` embebidos, hasta 20 ids. Es como Athena cierra un partido: un request por cada veinte | 15 s |
| `/fixtures?live=all` | **Todos** los partidos en juego, eventos embebidos, 1 request | 15 s |
| `/fixtures/events`, `/lineups`, `/statistics`, `/players` | Detalle por fixture (~4 calls post-partido) | 15 s / 15 min / 1 min / 1 min |
| `/standings?league&season` | Tablas (puede haber varias: grupos, apertura/clausura) | 1 h |
| `/players/topscorers`, `/topassists` | Rankings top-20 | diaria |
| `/transfers`, `/injuries`, `/trophies`, `/sidelined` | Eventos de dominio | diaria / 4 h |
| `/predictions?fixture` | Predicciones algorítmicas | 1 h |
| `/odds`, `/odds/live` | No-MVP. Pre-match existe solo −14/+7 días; live no se archiva | 3 h / ~5 s |

## Reglas duras del adaptador

1. **IDs permanentes** — fixture/league/team/player/venue ids nunca cambian → clave en `external_references`, jamás clave del dominio.
2. `season` = entero de 4 dígitos (año de inicio: 2025 ⇒ 2025-26). Stats siempre por par `(league, season)`.
3. `/players` devuelve `statistics[]` con **una entrada por (equipo, competencia)**: transferido = 2+ entradas; totales = suma del array. El `rating` es algoritmo interno del proveedor — no presentarlo como rating de Athena.
4. Todo en **UTC**; el parámetro `timezone` solo cambia presentación e interactúa con `date/from/to`. El dominio almacena UTC siempre.
5. Fixtures `TBD/PST/CANC` y partidos de copa (aparecen al conocerse ambos equipos) → re-sync diario.
6. Consultar `coverage` de `/leagues` antes de pedir lineups/stats/predictions: evita llamadas vacías garantizadas. Los flags cambian a `true` recién cuando la competencia arranca.
7. Lineups disponibles ~20-40 min antes del kickoff donde hay cobertura. Grid `X:Y` (fila desde el arco, columna izq→der), puede ser irregular.
8. Amistosos ignoran `coverage` — disponibilidad partido a partido.
9. No superar las cadencias del proveedor (tabla anterior): pedir más rápido es gasto sin datos nuevos.

## Dimensionamiento (cobertura amplia, ~12 competencias)

Peor caso (sábado, ~30 partidos simultáneos):

| Flujo | Requests/día |
|---|---|
| `fixtures?live=all` cada 20 s | ~4,300 |
| Stats por partido priorizado (1/min) | ~5,000 |
| Cierre post-partido (lotes de 20 vía `ids=`) | ~50 |
| Standings + referencia + rankings | ~500 |
| **Total** | **< 15,000 ≈ 10% de la cuota Mega** |

Backfill histórico: una sola vez, throttled < 600/min, fuera de horario de partidos.
