#!/usr/bin/env bash
# Stops the docs API and/or dev server (by their ports). Data is kept.
#
#   scripts/docs/stack/stop.sh [api|app|all]
set -euo pipefail
. "$(dirname "$0")/env.sh"
what="${1:-all}"
stop_port() {
  local pids
  pids="$(docs_port_pids "$1")"
  [ -n "$pids" ] && kill $pids 2>/dev/null || true
  for _ in $(seq 1 20); do docs_port_open "$1" || return 0; sleep 0.5; done
}
case "$what" in
  api) stop_port "$DOCS_API_PORT" ;;
  app) stop_port "$DOCS_APP_PORT" ;;
  all) stop_port "$DOCS_API_PORT"; stop_port "$DOCS_APP_PORT" ;;
  *) echo "usage: $0 [api|app|all]" >&2; exit 64 ;;
esac
echo "stopped: $what"
