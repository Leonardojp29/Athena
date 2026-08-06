#!/usr/bin/env bash
# Levanta el stack local completo: Redis, API, worker y web (builds de dist/).
# Uso: ./infra/dev-stack.sh [--stop]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$ROOT/.logs"

stop_stack() {
  # patrones sin ruta: los procesos pueden haberse lanzado con ruta relativa o absoluta
  pkill -f "dist/main.api.js" 2>/dev/null || true
  pkill -f "dist/main.worker.js" 2>/dev/null || true
  pkill -f "dist/server/entry.mjs" 2>/dev/null || true
  sleep 1
}

if [[ "${1:-}" == "--stop" ]]; then
  stop_stack
  echo "Stack detenido (Redis sigue en Docker; usa 'docker compose -f infra/docker-compose.yml down' si quieres pararlo)"
  exit 0
fi

mkdir -p "$LOGS"
stop_stack
docker compose -f "$ROOT/infra/docker-compose.yml" up -d

setsid node --env-file-if-exists="$ROOT/.env" "$ROOT/apps/api/dist/main.api.js" >> "$LOGS/api.log" 2>&1 < /dev/null &
setsid node --env-file-if-exists="$ROOT/.env" "$ROOT/apps/api/dist/main.worker.js" >> "$LOGS/worker.log" 2>&1 < /dev/null &
setsid env PORT=4321 node "$ROOT/apps/web/dist/server/entry.mjs" >> "$LOGS/web.log" 2>&1 < /dev/null &

# con límite: si un proceso no arranca, reportamos en lugar de esperar para siempre
wait_for() {
  local url=$1 name=$2 log=$3
  for _ in $(seq 60); do
    curl -sf "$url" >/dev/null 2>&1 && return 0
    sleep 0.5
  done
  echo "✗ $name no respondió en 30s. Últimas líneas de $log:" >&2
  tail -5 "$log" >&2
  return 1
}

failed=0
wait_for http://localhost:3001/v1/health "API" "$LOGS/api.log" || failed=1
wait_for http://localhost:4321/ "Web" "$LOGS/web.log" || failed=1
[[ $failed -eq 1 ]] && exit 1

echo "Stack listo → web http://localhost:4321 · api http://localhost:3001 (docs en /docs) · logs en .logs/"
