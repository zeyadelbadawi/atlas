#!/usr/bin/env bash
# Recreates the LOCAL demo database ($DOCS_DB_NAME, default atlas_docs) from
# the backend's migrations and its plan catalog seed, and clears the demo
# Redis database index. Stops the docs API first (it holds connections).
#
#   scripts/docs/stack/reset-db.sh
set -euo pipefail
. "$(dirname "$0")/env.sh"
docs_load_env

"$(dirname "$0")/stop.sh" api >/dev/null 2>&1 || true

as_postgres() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else sudo -u postgres "$@"; fi; }
# The local superuser over the Unix socket (peer authentication).
as_postgres psql -p "$DOCS_PG_PORT" -qX -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$DOCS_DB_NAME\" WITH (FORCE)" \
  -c "CREATE DATABASE \"$DOCS_DB_NAME\" OWNER \"$DOCS_PG_ADMIN_USER\""

redis-cli -u "$REDIS_URL" flushdb >/dev/null

cd "$DOCS_BACKEND_DIR"
mkdir -p "$DOCS_STACK_DIR"
npx prisma migrate deploy >"$DOCS_STACK_DIR/migrate.log" 2>&1 || { tail -30 "$DOCS_STACK_DIR/migrate.log"; exit 1; }
npx ts-node -r tsconfig-paths/register scripts/seed-production-plan-catalog.ts >>"$DOCS_STACK_DIR/migrate.log" 2>&1 \
  || { tail -30 "$DOCS_STACK_DIR/migrate.log"; exit 1; }
rm -f "$DOCS_ATLAS_DIR/scripts/docs/seed/state.json"
echo "reset: database $DOCS_DB_NAME migrated, plan catalog seeded (log: $DOCS_STACK_DIR/migrate.log)"
