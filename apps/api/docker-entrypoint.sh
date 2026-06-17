#!/bin/sh
set -e

if [ "$SKIP_DB_MIGRATIONS" = "1" ] || [ "$SKIP_DB_MIGRATIONS" = "true" ]; then
  echo "Skipping database migrations (SKIP_DB_MIGRATIONS is set)."
else
  echo "Running database migrations..."
  if ! alembic upgrade head; then
    echo "ERROR: Database migration failed. Check DATABASE_URL / DATABASE_MIGRATIONS_URL and Postgres logs."
    exit 1
  fi
fi

echo "Starting API server..."
exec uvicorn gentletap.main:app --host 0.0.0.0 --port 8000
