#!/usr/bin/env bash
# Starts the Vite dev server of this repo on 127.0.0.1:$DOCS_APP_PORT with its
# /api proxy pointed at the docs API (127.0.0.1:$DOCS_API_PORT).
#
#   scripts/docs/stack/start-frontend.sh
set -euo pipefail
. "$(dirname "$0")/env.sh"
mkdir -p "$DOCS_STACK_DIR"

# The browser must call the local API through the dev proxy, never a remote one.
api_base="${VITE_API_BASE_URL:-$(grep -E '^VITE_API_BASE_URL=' "$DOCS_ATLAS_DIR/.env" 2>/dev/null | cut -d= -f2-)}"
case "$api_base" in
  ''|/*) ;;
  *) docs_guard_local "$api_base" ;;
esac

"$(dirname "$0")/stop.sh" app >/dev/null 2>&1 || true
cd "$DOCS_ATLAS_DIR"
VITE_PORT="$DOCS_APP_PORT" BACKEND_PORT="$DOCS_API_PORT" VITE_API_BASE_URL=/api/v1 \
  nohup node_modules/.bin/vite --port "$DOCS_APP_PORT" --strictPort --host 127.0.0.1 \
  >"$DOCS_STACK_DIR/frontend.log" 2>&1 &
echo $! > "$DOCS_STACK_DIR/frontend.pid"
for _ in $(seq 1 60); do
  if curl -sf --noproxy '*' -o /dev/null "http://127.0.0.1:$DOCS_APP_PORT/auth/sign-in"; then
    echo "app up: http://localhost:$DOCS_APP_PORT (log: $DOCS_STACK_DIR/frontend.log)"
    exit 0
  fi
  sleep 1
done
echo "the dev server did not start; see $DOCS_STACK_DIR/frontend.log" >&2
exit 1
