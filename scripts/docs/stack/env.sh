# shellcheck shell=bash
# Shared configuration for the Help Center screenshot stack (sourced by the
# other scripts in this folder). Everything is LOCAL: a database on the
# machine's own PostgreSQL, a Redis database index, a local S3-compatible
# store, the API from a private build, and the Vite dev server.
#
# Override any value through the environment (see scripts/docs/README.md).
# The production guard below refuses to continue if a URL points anywhere
# but this machine.

DOCS_ATLAS_DIR="${DOCS_ATLAS_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)}"
DOCS_BACKEND_DIR="${DOCS_BACKEND_DIR:-$DOCS_ATLAS_DIR/../atlas-backend}"
# Generated files (env with throwaway secrets, API build, logs, pids): never in the repo.
DOCS_STACK_DIR="${DOCS_STACK_DIR:-/tmp/atlas-docs-stack}"
DOCS_DB_NAME="${DOCS_DB_NAME:-atlas_docs}"
DOCS_PG_HOST="${DOCS_PG_HOST:-localhost}"
DOCS_PG_PORT="${DOCS_PG_PORT:-5432}"
# Local development roles (created by the backend's migrations / local setup).
DOCS_PG_ADMIN_USER="${DOCS_PG_ADMIN_USER:-atlas}"
DOCS_PG_ADMIN_PASSWORD="${DOCS_PG_ADMIN_PASSWORD:-atlas_ci_password}"
DOCS_PG_APP_PASSWORD="${DOCS_PG_APP_PASSWORD:-atlas_app_dev_password}"
DOCS_REDIS_URL="${DOCS_REDIS_URL:-redis://127.0.0.1:6379/7}"
DOCS_S3_ENDPOINT="${DOCS_S3_ENDPOINT:-http://127.0.0.1:9000}"
DOCS_S3_ACCESS_KEY="${DOCS_S3_ACCESS_KEY:-atlas_media_ci}"
DOCS_S3_SECRET_KEY="${DOCS_S3_SECRET_KEY:-atlas_media_ci_password}"
DOCS_S3_BUCKET="${DOCS_S3_BUCKET:-atlas-media-ci}"
DOCS_API_PORT="${DOCS_API_PORT:-3100}"
DOCS_APP_PORT="${DOCS_APP_PORT:-3111}"

DOCS_ENV_FILE="$DOCS_STACK_DIR/backend.env"

docs_die() { echo "docs-stack: $*" >&2; exit 2; }

# Production guard: every URL must name this machine.
docs_guard_local() {
  local url host
  for url in "$@"; do
    host="$(printf '%s' "$url" | sed -E 's#^[a-z+]+://##; s#^[^@/]*@##; s#[:/?].*$##')"
    case "$host" in
      localhost|127.0.0.1|'[::1]') ;;
      *) docs_die "REFUSING: $url does not point at this machine (host '$host')." ;;
    esac
  done
}

docs_guard_local \
  "postgresql://x@$DOCS_PG_HOST:$DOCS_PG_PORT/$DOCS_DB_NAME" \
  "$DOCS_REDIS_URL" "$DOCS_S3_ENDPOINT" \
  "http://127.0.0.1:$DOCS_API_PORT" "http://127.0.0.1:$DOCS_APP_PORT"
case "$DOCS_DB_NAME" in
  atlas_ci*|atlas_e2e*|postgres|template*) docs_die "REFUSING: $DOCS_DB_NAME belongs to other local work." ;;
esac

docs_hex() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }

# Writes the API's env file once (throwaway secrets generated on this machine).
docs_write_env() {
  mkdir -p "$DOCS_STACK_DIR"
  [ -f "$DOCS_ENV_FILE" ] && return 0
  local db="$DOCS_PG_HOST:$DOCS_PG_PORT/$DOCS_DB_NAME?schema=public&connection_limit=9"
  cat > "$DOCS_ENV_FILE" <<ENV
NODE_ENV=development
PORT=$DOCS_API_PORT
DATABASE_URL='postgresql://$DOCS_PG_ADMIN_USER:$DOCS_PG_ADMIN_PASSWORD@$db'
APP_DATABASE_URL='postgresql://atlas_app:$DOCS_PG_APP_PASSWORD@$db'
REDIS_URL=$DOCS_REDIS_URL
CORS_ALLOWED_ORIGINS=http://localhost:$DOCS_APP_PORT,http://127.0.0.1:$DOCS_APP_PORT
LOG_LEVEL=warn
R2_ENDPOINT=$DOCS_S3_ENDPOINT
R2_REGION=us-east-1
R2_ACCESS_KEY_ID=$DOCS_S3_ACCESS_KEY
R2_SECRET_ACCESS_KEY=$DOCS_S3_SECRET_KEY
R2_BUCKET=$DOCS_S3_BUCKET
R2_PUBLIC_URL_BASE=$DOCS_S3_ENDPOINT/$DOCS_S3_BUCKET
R2_FORCE_PATH_STYLE=true
MEDIA_MAX_UPLOAD_BYTES=10485760
PAYMENT_WEBHOOK_SECRET=$(docs_hex 32)
JWT_ACCESS_SECRET=$(docs_hex 48)
PAYMENT_CREDENTIALS_ENCRYPTION_KEY=$(docs_hex 32)
EMAIL_PROVIDER=stub
EMAIL_DELIVERABILITY_CHECK_ENABLED=false
FLAG_QUIZ_ENGINE_V2_MODE=on
FLAG_QUIZ_INTEGRITY_MODE=on
FLAG_SIGNUP_ORGANIZATION_MODE=on
# Local demo only: owners sign in with a password (no emailed code).
AUTH_PRIVILEGED_EMAIL_OTP_FLOOR=off
PLATFORM_OWNER_TOTP_REQUIRED_FROM=never
ENV
}

docs_load_env() {
  docs_write_env
  set -a
  # shellcheck disable=SC1090
  . "$DOCS_ENV_FILE"
  set +a
  docs_guard_local "$DATABASE_URL" "$APP_DATABASE_URL" "$REDIS_URL" "$R2_ENDPOINT" "$R2_PUBLIC_URL_BASE"
}

# PIDs listening on a TCP port (lsof, fuser or /proc fallback).
docs_port_pids() {
  if command -v lsof >/dev/null 2>&1; then lsof -t -iTCP:"$1" -sTCP:LISTEN 2>/dev/null || true
  elif command -v fuser >/dev/null 2>&1; then fuser "$1"/tcp 2>/dev/null || true
  fi
}

docs_port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
