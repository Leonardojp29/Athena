#!/usr/bin/env bash
# El stack local completo: API, worker y web. (Postgres y todo el estado viven en Supabase.)
#
# Corre los builds de dist/, no los servidores de desarrollo: es lo mismo que se despliega y no
# ocupa dos terminales vigilando recargas. Después de cambiar código hay que reconstruir.
#
# Uso:
#   pnpm start    (o ./infra/dev-stack.sh)          levanta todo
#   pnpm stop     (o ./infra/dev-stack.sh --stop)   baja API, worker y web
#   pnpm estado   (o ./infra/dev-stack.sh --status) dice qué está arriba
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$ROOT/.logs"

WEB_URL="http://localhost:4321"
API_URL="http://localhost:3001"

stop_stack() {
  # patrones sin ruta: los procesos pueden haberse lanzado con ruta relativa o absoluta
  pkill -f "dist/main.api.js" 2>/dev/null || true
  pkill -f "dist/main.worker.js" 2>/dev/null || true
  pkill -f "dist/server/entry.mjs" 2>/dev/null || true
  sleep 1
}

estado() {
  local nombre=$1 url=$2
  if curl -sf "$url" >/dev/null 2>&1; then
    echo "  ✓ $nombre  $url"
  else
    echo "  ✗ $nombre  $url (no responde)"
  fi
}

case "${1:-}" in
  --stop)
    stop_stack
    echo "Stack detenido."
    exit 0
    ;;
  --status)
    echo "Athena:"
    estado "web    " "$WEB_URL"
    estado "api    " "$API_URL/v1/health"
    pgrep -f "dist/main.worker.js" >/dev/null && echo "  ✓ worker  (sync y colas)" || echo "  ✗ worker  (sync y colas)"
    exit 0
    ;;
esac

# Sin builds no hay nada que servir, y el error de node no lo explica.
for artefacto in "$ROOT/apps/api/dist/main.api.js" "$ROOT/apps/web/dist/server/entry.mjs"; do
  if [[ ! -f "$artefacto" ]]; then
    echo "Falta $artefacto. Corré primero: pnpm build" >&2
    exit 1
  fi
done

mkdir -p "$LOGS"
stop_stack

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
wait_for "$API_URL/v1/health" "API" "$LOGS/api.log" || failed=1
wait_for "$WEB_URL/" "Web" "$LOGS/web.log" || failed=1
[[ $failed -eq 1 ]] && exit 1

echo "Stack listo → entrá por $WEB_URL"
echo "  api $API_URL (documentación en /docs) · logs en .logs/"
