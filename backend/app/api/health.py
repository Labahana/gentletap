"""Health check endpoints."""

import logging

from fastapi import APIRouter

router = APIRouter(tags=["Health"])
logger = logging.getLogger(__name__)


def check_db() -> dict:
    try:
        from app.database import engine
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as exc:  # noqa: BLE001
        # Detail can embed the DSN (user:password@host) — log it, never return it.
        logger.error("health/db check failed: %s", exc)
        return {"status": "error"}


def check_redis() -> dict:
    try:
        from app.services.redis_lock import get_redis

        r = get_redis()
        r.ping()
        return {"status": "ok"}
    except Exception as exc:  # noqa: BLE001
        logger.error("health/redis check failed: %s", exc)
        return {"status": "error"}


def check_celery() -> dict:
    try:
        from app.workers.celery_app import celery_app

        insp = celery_app.control.inspect(timeout=1.0)
        pings = insp.ping() if insp else None
        if pings:
            return {"status": "ok", "workers": list(pings.keys())}
        return {"status": "degraded"}
    except Exception as exc:  # noqa: BLE001
        logger.error("health/celery check failed: %s", exc)
        return {"status": "error"}


@router.get("/health/db")
def health_db():
    return {"status": check_db()["status"]}


@router.get("/health/redis")
def health_redis():
    return {"status": check_redis()["status"]}


@router.get("/health/celery")
def health_celery():
    c = check_celery()
    return {"status": c["status"], "workers": c.get("workers", [])}
