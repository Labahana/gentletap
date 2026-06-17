import pytest
from sqlalchemy import text

from gentletap.database import engine


@pytest.fixture(scope="session")
def db_available() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


@pytest.fixture
def requires_db(db_available: bool):
    if not db_available:
        pytest.skip("Postgres not available (start: docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d)")


@pytest.fixture
def db_session(requires_db):
    from gentletap.database import SessionLocal

    db = SessionLocal()
    try:
        yield db
    finally:
        db.rollback()
        db.close()
