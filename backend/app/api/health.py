"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


def check_db() -> dict:
    try:
        from app.database import engine
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)[:200]}


def check_redis() -> dict:
    try:
        from app.services.redis_lock import get_redis

        r = get_redis()
        r.ping()
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)[:200]}


def check_celery() -> dict:
    try:
        from app.workers.celery_app import celery_app

        insp = celery_app.control.inspect(timeout=1.0)
        pings = insp.ping() if insp else None
        if pings:
            return {"status": "ok", "workers": list(pings.keys())}
        return {"status": "degraded", "detail": "no workers responded"}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)[:200]}


@router.get("/health/db")
def health_db():
    return check_db()


@router.get("/health/redis")
def health_redis():
    return check_redis()


@router.get("/health/celery")
def health_celery():
    return check_celery()
