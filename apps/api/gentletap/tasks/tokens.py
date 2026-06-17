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
        connections = (
            db.query(QuickBooksConnection)
            .filter(QuickBooksConnection.disconnected_at.is_(None))
            .all()
        )
        for conn in connections:
            if conn.token_expires_at:
                expires = conn.token_expires_at
                if expires.tzinfo is None:
                    expires = expires.replace(tzinfo=UTC)
                if expires <= datetime.now(UTC) + timedelta(days=1):
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
        connections = (
            db.query(GoogleConnection)
            .filter(GoogleConnection.disconnected_at.is_(None))
            .all()
        )
        for conn in connections:
            if conn.token_expires_at:
                expires = conn.token_expires_at
                if expires.tzinfo is None:
                    expires = expires.replace(tzinfo=UTC)
                if expires <= datetime.now(UTC) + timedelta(days=1):
                    google_oauth.refresh_connection_tokens(db, conn)
                    refreshed += 1
        return {"refreshed": refreshed}
    finally:
        db.close()
