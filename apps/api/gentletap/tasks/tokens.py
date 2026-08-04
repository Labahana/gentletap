from datetime import UTC, datetime, timedelta

import logging

from gentletap.database import FreshBooksConnection, GoogleConnection, QuickBooksConnection, SessionLocal
from gentletap.integrations.freshbooks.oauth import refresh_connection_tokens as refresh_fb_tokens
from gentletap.integrations.google import oauth as google_oauth
from gentletap.integrations.quickbooks.oauth import refresh_connection_tokens
from gentletap.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="gentletap.tasks.tokens.refresh_qb_tokens")
def refresh_qb_tokens() -> dict:
    db = SessionLocal()
    refreshed = 0
    try:
        cutoff = datetime.now(UTC) + timedelta(days=1)
        connections = (
            db.query(QuickBooksConnection)
            .filter(
                QuickBooksConnection.disconnected_at.is_(None),
                QuickBooksConnection.token_expires_at.isnot(None),
                QuickBooksConnection.token_expires_at <= cutoff,
            )
            .all()
        )
        for conn in connections:
            try:
                refresh_connection_tokens(db, conn)
                refreshed += 1
            except Exception:
                logger.exception("QuickBooks token refresh failed for connection %s", conn.id)
                db.rollback()
                continue
        return {"refreshed": refreshed}
    finally:
        db.close()


@celery_app.task(name="gentletap.tasks.tokens.refresh_fb_tokens")
def refresh_fb_tokens_task() -> dict:
    """Proactively refresh FreshBooks access tokens (12h / 43,200s TTL; refresh tokens rotate)."""
    db = SessionLocal()
    refreshed = 0
    try:
        # Beat runs every 30m; refresh anything expiring within 6h so we never hit a dead access token.
        cutoff = datetime.now(UTC) + timedelta(hours=6)
        connections = (
            db.query(FreshBooksConnection)
            .filter(
                FreshBooksConnection.disconnected_at.is_(None),
                FreshBooksConnection.token_expires_at.isnot(None),
                FreshBooksConnection.token_expires_at <= cutoff,
            )
            .all()
        )
        for conn in connections:
            try:
                refresh_fb_tokens(db, conn)
                refreshed += 1
            except Exception:
                logger.exception("FreshBooks token refresh failed for connection %s", conn.id)
                db.rollback()
                continue
        return {"refreshed": refreshed}
    finally:
        db.close()


@celery_app.task(name="gentletap.tasks.tokens.refresh_google_tokens")
def refresh_google_tokens() -> dict:
    db = SessionLocal()
    refreshed = 0
    try:
        cutoff = datetime.now(UTC) + timedelta(days=1)
        connections = (
            db.query(GoogleConnection)
            .filter(
                GoogleConnection.disconnected_at.is_(None),
                GoogleConnection.token_expires_at.isnot(None),
                GoogleConnection.token_expires_at <= cutoff,
            )
            .all()
        )
        for conn in connections:
            try:
                google_oauth.refresh_connection_tokens(db, conn)
                refreshed += 1
            except Exception:
                logger.exception("Google token refresh failed for connection %s", conn.id)
                db.rollback()
                continue
        return {"refreshed": refreshed}
    finally:
        db.close()
