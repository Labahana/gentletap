#!/bin/sh
set -e

# Allow one-off commands: docker compose run --rm api alembic upgrade head
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

# Core tables (users, organizations, invoices, …) are created by SQLAlchemy's
# create_all, not by the Alembic migrations (which only layer delta tables/columns
# on top). Bootstrap that base schema first so a fresh database is complete before
# migrations run. create_all is idempotent (checkfirst), so this is safe on both
# fresh and already-initialized databases.
echo "Ensuring base schema exists (create_all is idempotent)..."
python -c "import app.models; from app.database import Base, engine; Base.metadata.create_all(bind=engine)"

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
