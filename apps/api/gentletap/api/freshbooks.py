from datetime import UTC, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import FreshBooksConnection, Invoice, get_db
from gentletap.dependencies import CurrentUser
from gentletap.integrations.freshbooks import client as fb_client
from gentletap.integrations.freshbooks import oauth as fb_oauth
from gentletap.integrations.freshbooks.sync import sync_status_key
from gentletap.rate_limit import limiter
from gentletap.tasks.sync import sync_user_freshbooks_invoices
from gentletap.utils.redis_client import get_json

router = APIRouter(prefix="/freshbooks", tags=["freshbooks"])


@router.get("/connect-url")
@limiter.limit("30/minute")
def get_connect_url(request: Request, user: CurrentUser) -> dict:
    if not fb_oauth.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "FreshBooks OAuth is not configured. "
                "Add FRESHBOOKS_CLIENT_ID and FRESHBOOKS_CLIENT_SECRET to .env"
            ),
        )
    try:
        url = fb_oauth.create_authorization_url(user.id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"authorization_url": url}


@router.get("/connect")
@limiter.limit("30/minute")
def connect_freshbooks(request: Request, user: CurrentUser) -> RedirectResponse:
    payload = get_connect_url(request, user)
    return RedirectResponse(url=payload["authorization_url"], status_code=status.HTTP_302_FOUND)


@router.get("/callback")
@limiter.limit("60/minute")
def oauth_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    settings = get_settings()
    try:
        user = fb_oauth.handle_oauth_callback(db, code=code, state=state)
    except ValueError as exc:
        return RedirectResponse(
            url=f"{settings.web_url}/onboarding?fb=error&message={quote(str(exc))}",
            status_code=status.HTTP_302_FOUND,
        )

    connection = (
        db.query(FreshBooksConnection)
        .filter(
            FreshBooksConnection.user_id == user.id,
            FreshBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is not None:
        webhook_uri = f"{settings.api_url.rstrip('/')}/v1/webhooks/freshbooks"
        try:
            fb_client.register_webhooks(db, connection, webhook_uri)
        except Exception:
            pass

    sync_user_freshbooks_invoices.delay(str(user.id))
    return RedirectResponse(
        url=f"{settings.web_url}/onboarding?fb=connected",
        status_code=status.HTTP_302_FOUND,
    )


@router.post("/disconnect")
def disconnect_freshbooks(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    connection = (
        db.query(FreshBooksConnection)
        .filter(
            FreshBooksConnection.user_id == user.id,
            FreshBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        return {"status": "not_connected"}

    connection.disconnected_at = datetime.now(UTC)
    db.commit()
    return {"status": "disconnected"}


@router.post("/sync")
def trigger_sync(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    connection = (
        db.query(FreshBooksConnection)
        .filter(
            FreshBooksConnection.user_id == user.id,
            FreshBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="FreshBooks not connected")

    sync_user_freshbooks_invoices.delay(str(user.id))
    return {"status": "syncing", "message": "Invoice sync started"}


@router.get("/sync/status")
def sync_status(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    connection = (
        db.query(FreshBooksConnection)
        .filter(
            FreshBooksConnection.user_id == user.id,
            FreshBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        return {
            "status": "idle",
            "progress": 0,
            "message": "FreshBooks not connected yet",
            "connected": False,
            "unpaid_count": 0,
            "total_outstanding": 0.0,
        }

    cached = get_json(sync_status_key(user.id))
    if cached:
        return {
            **cached,
            "connected": True,
            "account_id": connection.account_id,
            "business_name": connection.business_name,
            "last_sync_at": connection.last_sync_at.isoformat() if connection.last_sync_at else None,
        }

    unpaid_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.source == "freshbooks")
        .scalar()
        or 0
    )
    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.source == "freshbooks")
        .scalar()
        or 0
    )

    return {
        "status": "complete" if connection.last_sync_at else "idle",
        "progress": 100 if connection.last_sync_at else 0,
        "message": "FreshBooks connected" if connection.last_sync_at else "Ready to sync",
        "connected": True,
        "account_id": connection.account_id,
        "business_name": connection.business_name,
        "last_sync_at": connection.last_sync_at.isoformat() if connection.last_sync_at else None,
        "unpaid_count": unpaid_count,
        "total_outstanding": float(total_outstanding),
    }
