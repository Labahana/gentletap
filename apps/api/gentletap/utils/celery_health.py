"""Celery worker / beat health probes."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def celery_worker_status(timeout: float = 1.5) -> str:
    """Return ok | no_workers | error."""
    try:
        from gentletap.tasks.celery_app import celery_app

        inspect = celery_app.control.inspect(timeout=timeout)
        ping = inspect.ping()
        if ping:
            return "ok"
        return "no_workers"
    except Exception as exc:
        logger.warning("Celery worker health check failed: %s", exc)
        return "error"
