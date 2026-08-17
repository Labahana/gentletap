from collections.abc import Generator
from datetime import datetime

from sqlalchemy import DateTime, create_engine, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from app.config import get_settings

settings = get_settings()

_engine_kwargs: dict = {}
if settings.database_url.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
elif settings.database_url.startswith("postgresql"):
    _engine_kwargs["pool_pre_ping"] = True
    _engine_kwargs["pool_size"] = settings.db_pool_size
    _engine_kwargs["max_overflow"] = settings.db_max_overflow

# Prefer SQLite when postgres driver is unavailable (local unit tests)
_url = settings.database_url
if _url.startswith("postgresql"):
    try:
        import psycopg2  # noqa: F401
    except ImportError:
        _url = "sqlite:///./gentletap_fallback.db"
        _engine_kwargs = {"connect_args": {"check_same_thread": False}}

engine = create_engine(_url, **_engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
