from datetime import UTC, datetime
from urllib.parse import quote

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Invoice, QuickBooksConnection, get_db
from gentletap.dependencies import CurrentUser
from gentletap.integrations.quickbooks import oauth as qb_oauth
from gentletap.integrations.quickbooks.sync import sync_status_key
from gentletap.rate_limit import limiter
from gentletap.tasks.sync import sync_user_invoices
from gentletap.utils.crypto import decrypt_token
from gentletap.utils.redis_client import get_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quickbooks", tags=["quickbooks"])


@router.get("/connect-url")
@limiter.limit("30/minute")
def get_connect_url(request: Request, user: CurrentUser) -> dict:
    if not qb_oauth.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="QuickBooks OAuth is not configured. Add INTUIT_CLIENT_ID and INTUIT_CLIENT_SECRET to .env",
        )
    try:
        url = qb_oauth.create_authorization_url(user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"authorization_url": url}


@router.get("/connect")
@limiter.limit("30/minute")
def connect_quickbooks(request: Request, user: CurrentUser) -> RedirectResponse:
    payload = get_connect_url(request, user)
    return RedirectResponse(url=payload["authorization_url"], status_code=status.HTTP_302_FOUND)


@router.get("/callback")
@limiter.limit("60/minute")
def oauth_callback(
    request: Request,
    code: str | None = Query(None),
    state: str = Query(...),
    realmId: str | None = Query(None),
    error: str | None = Query(None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    settings = get_settings()
    if error or not code or not realmId:
        # User denied access (or Intuit returned an error) — no code is sent.
        message = quote("QuickBooks connection was cancelled")
        return RedirectResponse(
            url=f"{settings.web_url}/onboarding?qb=error&message={message}",
            status_code=status.HTTP_302_FOUND,
        )
    try:
        user = qb_oauth.handle_oauth_callback(db, code=code, state=state, realm_id=realmId)
    except ValueError as exc:
        return RedirectResponse(
            url=f"{settings.web_url}/onboarding?qb=error&message={quote(str(exc))}",
            status_code=status.HTTP_302_FOUND,
        )
    except Exception:
        logger.exception("QuickBooks OAuth callback failed")
        return RedirectResponse(
            url=f"{settings.web_url}/onboarding?qb=error&message={quote('QuickBooks connection failed — please try again')}",
            status_code=status.HTTP_302_FOUND,
        )

    sync_user_invoices.delay(str(user.id))
    return RedirectResponse(
        url=f"{settings.web_url}/onboarding?qb=connected",
        status_code=status.HTTP_302_FOUND,
    )


@router.post("/disconnect")
def disconnect_quickbooks(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    connection = (
        db.query(QuickBooksConnection)
        .filter(
            QuickBooksConnection.user_id == user.id,
            QuickBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        return {"status": "not_connected"}

    try:
        access_token = decrypt_token(connection.access_token_enc)
        qb_oauth.revoke_tokens(access_token)
    except Exception:
        pass

    connection.disconnected_at = datetime.now(UTC)
    db.commit()
    return {"status": "disconnected"}


@router.post("/sync")
def trigger_sync(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    connection = (
        db.query(QuickBooksConnection)
        .filter(
            QuickBooksConnection.user_id == user.id,
            QuickBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="QuickBooks not connected")

    sync_user_invoices.delay(str(user.id))
    return {"status": "syncing", "message": "Invoice sync started"}


@router.get("/sync/status")
def sync_status(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    connection = (
        db.query(QuickBooksConnection)
        .filter(
            QuickBooksConnection.user_id == user.id,
            QuickBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        return {
            "status": "idle",
            "progress": 0,
            "message": "QuickBooks not connected yet",
            "connected": False,
            "unpaid_count": 0,
            "total_outstanding": 0.0,
        }

    cached = get_json(sync_status_key(user.id))
    if cached:
        return {
            **cached,
            "connected": True,
            "realm_id": connection.realm_id,
            "last_sync_at": connection.last_sync_at.isoformat() if connection.last_sync_at else None,
        }

    unpaid_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .scalar()
        or 0
    )
    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .scalar()
        or 0
    )

    return {
        "status": "complete" if connection.last_sync_at else "idle",
        "progress": 100 if connection.last_sync_at else 0,
        "message": "QuickBooks connected" if connection.last_sync_at else "Ready to sync",
        "connected": True,
        "realm_id": connection.realm_id,
        "last_sync_at": connection.last_sync_at.isoformat() if connection.last_sync_at else None,
        "unpaid_count": unpaid_count,
        "total_outstanding": float(total_outstanding),
    }
