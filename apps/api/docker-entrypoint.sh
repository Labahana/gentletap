#!/bin/sh
set -e

echo "Running database migrations..."
if ! alembic upgrade head; then
  echo "ERROR: Database migration failed. Check DATABASE_URL and Postgres logs."
  exit 1
fi

echo "Starting API server..."
exec uvicorn gentletap.main:app --host 0.0.0.0 --port 8000
