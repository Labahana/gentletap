import os

# Tests run in a non-production environment so the app boots without live
# secrets and the database layer may fall back to SQLite (psycopg2 isn't a
# test-time dependency). This must be set before any app import pulls in
# app.config.get_settings(), which is lru_cached on first call. Conftest is
# imported by pytest before test modules, so this ordering holds.
os.environ["ENVIRONMENT"] = "development"
os.environ.setdefault("ALLOW_DEV_AUTH_FALLBACK", "false")
