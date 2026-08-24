"""Proactive OAuth token refresh for QuickBooks, FreshBooks, and Google connections."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models.connection import Connection
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()

QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
FRESHBOOKS_TOKEN_URL = "https://api.freshbooks.com/auth/oauth/token"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def _refresh_connection_token(db: Session, conn: Connection) -> None:
    """Refresh one connection's access token using its refresh token."""
    from app.services.crypto import decrypt_secret, encrypt_secret

    refresh_token = decrypt_secret(conn.refresh_token_encrypted)
    if not refresh_token or decrypt_secret(conn.token_encrypted).startswith("mock_"):
        return  # dev/mock mode — nothing to refresh

    if conn.provider == "quickbooks":
        data = {"grant_type": "refresh_token", "refresh_token": refresh_token}
        auth = (settings.quickbooks_client_id, settings.quickbooks_client_secret)
        with httpx.Client(timeout=15.0) as client:
            res = client.post(QBO_TOKEN_URL, data=data, auth=auth)
            res.raise_for_status()
            payload = res.json()
        conn.token_encrypted = encrypt_secret(payload["access_token"])
        if payload.get("refresh_token"):
            conn.refresh_token_encrypted = encrypt_secret(payload["refresh_token"])

    elif conn.provider == "freshbooks":
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.freshbooks_client_id,
            "client_secret": settings.freshbooks_client_secret,
            "redirect_uri": settings.freshbooks_redirect_uri,
        }
        with httpx.Client(timeout=15.0) as client:
            res = client.post(FRESHBOOKS_TOKEN_URL, json=data)
            res.raise_for_status()
            payload = res.json()
        conn.token_encrypted = encrypt_secret(payload["access_token"])
        if payload.get("refresh_token"):
            conn.refresh_token_encrypted = encrypt_secret(payload["refresh_token"])

    elif conn.provider in ("google", "gmail"):
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
        }
        with httpx.Client(timeout=15.0) as client:
            res = client.post(GOOGLE_TOKEN_URL, data=data)
            res.raise_for_status()
            payload = res.json()
        conn.token_encrypted = encrypt_secret(payload["access_token"])

    else:
        return

    conn.token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=payload.get("expires_in", 3600))
    db.commit()


def _refresh_all(provider: str, lookahead: timedelta) -> Dict[str, int]:
    db = SessionLocal()
    refreshed = failed = 0
    try:
        cutoff = datetime.now(timezone.utc) + lookahead
        connections = (
            db.query(Connection)
            .filter(
                Connection.provider == provider,
                Connection.status == "active",
                Connection.token_expires_at.isnot(None),
                Connection.token_expires_at <= cutoff,
            )
            .all()
        )
        for conn in connections:
            try:
                _refresh_connection_token(db, conn)
                refreshed += 1
            except Exception:
                failed += 1
                db.rollback()
                conn = db.query(Connection).filter(Connection.id == conn.id).first()
                if conn:
                    conn.status = "expired"
                    db.commit()
                logger.exception("%s token refresh failed for connection %s", provider, conn.id if conn else "?")
        return {"refreshed": refreshed, "failed": failed}
    finally:
        db.close()


@celery_app.task(name="app.tasks.token_refresh.refresh_qb_tokens")
def refresh_qb_tokens() -> Dict[str, int]:
    return _refresh_all("quickbooks", timedelta(days=1))


@celery_app.task(name="app.tasks.token_refresh.refresh_fb_tokens")
def refresh_fb_tokens() -> Dict[str, int]:
    # Access tokens are 12h; refresh anything expiring within 6h (beat runs every 30m)
    return _refresh_all("freshbooks", timedelta(hours=6))


@celery_app.task(name="app.tasks.token_refresh.refresh_google_tokens")
def refresh_google_tokens() -> Dict[str, int]:
    return _refresh_all("google", timedelta(days=1))
