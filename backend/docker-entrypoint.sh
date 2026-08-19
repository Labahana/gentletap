#!/bin/sh
set -e

# Allow one-off commands: docker compose run --rm api alembic upgrade head
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

if [ "$SKIP_DB_MIGRATIONS" = "1" ] || [ "$SKIP_DB_MIGRATIONS" = "true" ]; then
  echo "Skipping database migrations (SKIP_DB_MIGRATIONS is set)."
else
  echo "Running database migrations..."
  if ! alembic upgrade head; then
    echo "ERROR: Database migration failed. Check DATABASE_URL / Postgres logs."
    exit 1
  fi
fi

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
