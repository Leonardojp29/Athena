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

until curl -sf http://localhost:3001/v1/health >/dev/null 2>&1; do sleep 0.5; done
until curl -sf http://localhost:4321/ >/dev/null 2>&1; do sleep 0.5; done
echo "Stack listo → web http://localhost:4321 · api http://localhost:3001 (docs en /docs) · logs en .logs/"
