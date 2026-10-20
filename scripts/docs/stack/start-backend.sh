#!/usr/bin/env bash
# Builds the API from ../atlas-backend into $DOCS_STACK_DIR/backend-dist (the
# repo's own dist/ is left alone) and starts it on 127.0.0.1:$DOCS_API_PORT
# against the demo database. Idempotent: restarts a running docs API.
#
#   scripts/docs/stack/start-backend.sh            # build + start
#   scripts/docs/stack/start-backend.sh --no-build # start the last build
set -euo pipefail
. "$(dirname "$0")/env.sh"
docs_load_env

"$(dirname "$0")/stop.sh" api >/dev/null 2>&1 || true
cd "$DOCS_BACKEND_DIR"
if [ "${1:-}" != "--no-build" ] || [ ! -f "$DOCS_STACK_DIR/backend-dist/main.js" ]; then
  cat > "$DOCS_STACK_DIR/tsconfig.build.json" <<JSON
{
  "extends": "$DOCS_BACKEND_DIR/tsconfig.build.json",
  "compilerOptions": {
    "outDir": "$DOCS_STACK_DIR/backend-dist",
    "incremental": false,
    "sourceMap": false
  }
}
JSON
  echo "building the API (log: $DOCS_STACK_DIR/build.log)…"
  # The Nest CLI wants a tsconfig path relative to the project.
  rel="$(python3 -c 'import os,sys; print(os.path.relpath(sys.argv[1]))' "$DOCS_STACK_DIR/tsconfig.build.json")"
  npx prisma generate >"$DOCS_STACK_DIR/build.log" 2>&1
  npx nest build -p "$rel" >>"$DOCS_STACK_DIR/build.log" 2>&1 || { tail -30 "$DOCS_STACK_DIR/build.log"; exit 1; }
fi
# The build lives outside the backend: let it resolve the backend's packages.
ln -sfn "$DOCS_BACKEND_DIR/node_modules" "$DOCS_STACK_DIR/node_modules"
nohup node "$DOCS_STACK_DIR/backend-dist/main.js" >"$DOCS_STACK_DIR/backend.log" 2>&1 &
echo $! > "$DOCS_STACK_DIR/backend.pid"
for _ in $(seq 1 90); do
  if curl -sf --noproxy '*' -o /dev/null "http://127.0.0.1:$DOCS_API_PORT/api/v1/public/plans"; then
    echo "API up: http://127.0.0.1:$DOCS_API_PORT/api/v1 (log: $DOCS_STACK_DIR/backend.log)"
    exit 0
  fi
  kill -0 "$(cat "$DOCS_STACK_DIR/backend.pid")" 2>/dev/null || break
  sleep 1
done
echo "API did not start; last log lines:" >&2
tail -30 "$DOCS_STACK_DIR/backend.log" >&2
exit 1
