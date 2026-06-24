from datetime import UTC, datetime, timedelta

from gentletap.database import GoogleConnection, QuickBooksConnection, SessionLocal
from gentletap.integrations.google import oauth as google_oauth
from gentletap.integrations.quickbooks.oauth import refresh_connection_tokens
from gentletap.tasks.celery_app import celery_app


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
            refresh_connection_tokens(db, conn)
            refreshed += 1
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
            google_oauth.refresh_connection_tokens(db, conn)
            refreshed += 1
        return {"refreshed": refreshed}
    finally:
        db.close()
