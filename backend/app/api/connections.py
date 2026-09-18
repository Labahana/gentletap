import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.connection import Connection
from app.schemas.connection import ConnectionOut, SyncResponse
from app.services.quickbooks import get_qbo_auth_url, exchange_qbo_code, sync_qbo_data
from app.services.freshbooks import get_freshbooks_auth_url, exchange_freshbooks_code, sync_freshbooks_data
from app.services.google_gmail import get_google_gmail_auth_url, exchange_google_code
from app.services.oauth_state import create_state, verify_state
from app.services.crypto import encrypt_secret

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/connections", tags=["Connections"])


def _has_real_credentials(provider: str) -> bool:
    """True when provider OAuth creds are configured (i.e. real redirect flow)."""
    if provider == "quickbooks":
        cid = settings.intuit_client_id
    elif provider == "freshbooks":
        cid = settings.freshbooks_client_id
    else:
        cid = settings.google_client_id
    return bool(cid) and not cid.startswith("MOCK")


def _frontend_redirect(dest: str, params: dict) -> RedirectResponse:
    from urllib.parse import urlencode

    base = (settings.web_url or "https://gentletap.co").rstrip("/")
    path = "/integrations" if dest == "integrations" else "/onboarding"
    return RedirectResponse(f"{base}{path}?{urlencode(params)}", status_code=302)


@router.get("", response_model=List[ConnectionOut])
def list_connections(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    return db.query(Connection).filter(Connection.org_id == org.id).all()


def _upsert_connection(db: Session, org_id: str, provider: str, token_data: dict, realm_id: str = None) -> Connection:
    conn = db.query(Connection).filter(
        Connection.org_id == org_id, Connection.provider == provider
    ).first()

    access = token_data.get("access_token", "")
    refresh = token_data.get("refresh_token", "")
    account_id = token_data.get("email") or token_data.get("account_id") or realm_id

    if not conn:
        conn = Connection(
            org_id=org_id,
            provider=provider,
            token_encrypted=encrypt_secret(access),
            refresh_token_encrypted=encrypt_secret(refresh),
            status="active",
        )
        if provider == "quickbooks":
            conn.realm_id = token_data.get("realm_id") or realm_id
        elif provider == "freshbooks":
            conn.account_id = token_data.get("account_id") or account_id
        else:
            conn.account_id = account_id
        db.add(conn)
    else:
        conn.token_encrypted = encrypt_secret(access)
        conn.refresh_token_encrypted = encrypt_secret(refresh)
        conn.status = "active"
        if provider == "quickbooks" and (token_data.get("realm_id") or realm_id):
            conn.realm_id = token_data.get("realm_id") or realm_id
        elif provider == "freshbooks" and token_data.get("account_id"):
            conn.account_id = token_data.get("account_id")
        elif provider == "gmail" and account_id:
            conn.account_id = account_id

    db.commit()
    db.refresh(conn)
    return conn


def _mock_connect(db: Session, org_id: str, provider: str) -> dict:
    """Dev fallback: no real provider credentials configured — connect with mock tokens."""
    if provider == "quickbooks":
        token_data = exchange_qbo_code("mock_code", "mock_realm_id")
    elif provider == "freshbooks":
        token_data = exchange_freshbooks_code("mock_code")
    else:
        token_data = exchange_google_code("mock_code")
    conn = _upsert_connection(db, org_id, provider, token_data)
    return {"url": None, "connected": True, "connection_id": conn.id}


@router.post("/quickbooks/auth-url")
def quickbooks_auth_url(
    dest: str = Query("onboarding"),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    if not _has_real_credentials("quickbooks"):
        return _mock_connect(db, org.id, "quickbooks")
    state = create_state(org.id, "quickbooks", dest)
    return {"url": get_qbo_auth_url(state)}


@router.get("/quickbooks/callback")
def quickbooks_callback(
    code: str = Query(""),
    realmId: str = Query(""),
    state: str = Query(""),
    error: str = Query(""),
    db: Session = Depends(get_db),
):
    state_data = verify_state(state or "")
    if not state_data:
        return _frontend_redirect("onboarding", {"connect_error": "quickbooks", "message": "Connection request expired — please try again."})
    dest = state_data.get("dest", "onboarding")
    if error or not code:
        return _frontend_redirect(dest, {"connect_error": "quickbooks", "message": "QuickBooks connection was cancelled."})

    org_id = state_data["org"]
    try:
        token_data = exchange_qbo_code(code, realmId)
        conn = _upsert_connection(db, org_id, "quickbooks", token_data, realm_id=realmId)
    except Exception as exc:
        logger.error(f"QuickBooks OAuth exchange failed: {exc}")
        return _frontend_redirect(dest, {"connect_error": "quickbooks", "message": "Could not complete QuickBooks connection."})

    invoices = clients = 0
    try:
        invoices, clients = sync_qbo_data(db, org_id, conn)
    except Exception as exc:
        logger.error(f"QuickBooks sync after connect failed: {exc}")
        return _frontend_redirect(dest, {"connected": "quickbooks", "sync": "failed", "message": "Connected, but the first sync failed — try syncing from Integrations."})

    return _frontend_redirect(dest, {"connected": "quickbooks", "invoices": invoices, "clients": clients})


@router.post("/freshbooks/auth-url")
def freshbooks_auth_url(
    dest: str = Query("onboarding"),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    if not _has_real_credentials("freshbooks"):
        return _mock_connect(db, org.id, "freshbooks")
    state = create_state(org.id, "freshbooks", dest)
    return {"url": get_freshbooks_auth_url(state)}


@router.get("/freshbooks/callback")
def freshbooks_callback(
    code: str = Query(""),
    state: str = Query(""),
    error: str = Query(""),
    db: Session = Depends(get_db),
):
    state_data = verify_state(state or "")
    if not state_data:
        return _frontend_redirect("onboarding", {"connect_error": "freshbooks", "message": "Connection request expired — please try again."})
    dest = state_data.get("dest", "onboarding")
    if error or not code:
        return _frontend_redirect(dest, {"connect_error": "freshbooks", "message": "FreshBooks connection was cancelled."})

    org_id = state_data["org"]
    try:
        token_data = exchange_freshbooks_code(code)
        conn = _upsert_connection(db, org_id, "freshbooks", token_data)
    except Exception as exc:
        logger.error(f"FreshBooks OAuth exchange failed: {exc}")
        return _frontend_redirect(dest, {"connect_error": "freshbooks", "message": "Could not complete FreshBooks connection."})

    invoices = clients = 0
    try:
        invoices, clients = sync_freshbooks_data(db, org_id, conn)
    except Exception as exc:
        logger.error(f"FreshBooks sync after connect failed: {exc}")
        return _frontend_redirect(dest, {"connected": "freshbooks", "sync": "failed", "message": "Connected, but the first sync failed — try syncing from Integrations."})

    return _frontend_redirect(dest, {"connected": "freshbooks", "invoices": invoices, "clients": clients})


@router.post("/google/auth-url")
def google_auth_url(
    dest: str = Query("onboarding"),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    if not _has_real_credentials("gmail"):
        return _mock_connect(db, org.id, "gmail")
    state = create_state(org.id, "gmail", dest)
    return {"url": get_google_gmail_auth_url(state)}


@router.get("/google/callback")
def google_callback(
    code: str = Query(""),
    state: str = Query(""),
    error: str = Query(""),
    db: Session = Depends(get_db),
):
    state_data = verify_state(state or "")
    if not state_data:
        return _frontend_redirect("onboarding", {"connect_error": "gmail", "message": "Connection request expired — please try again."})
    dest = state_data.get("dest", "onboarding")
    if error or not code:
        return _frontend_redirect(dest, {"connect_error": "gmail", "message": "Gmail connection was cancelled."})

    org_id = state_data["org"]
    try:
        token_data = exchange_google_code(code)
        conn = _upsert_connection(db, org_id, "gmail", token_data)
    except Exception as exc:
        logger.error(f"Google OAuth exchange failed: {exc}")
        return _frontend_redirect(dest, {"connect_error": "gmail", "message": "Could not connect Gmail."})

    return _frontend_redirect(dest, {"connected": "gmail", "email": conn.account_id or ""})


@router.post("/{connection_id}/sync", response_model=SyncResponse)
def trigger_connection_sync(
    connection_id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    conn = db.query(Connection).filter(Connection.id == connection_id, Connection.org_id == org.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    if conn.provider == "quickbooks":
        inv_count, client_count = sync_qbo_data(db, org.id, conn)
    elif conn.provider == "freshbooks":
        inv_count, client_count = sync_freshbooks_data(db, org.id, conn)
    elif conn.provider in ("gmail", "google"):
        return SyncResponse(message="Gmail connected and ready for sending", invoices_synced=0, clients_synced=0)
    else:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    return SyncResponse(
        message=f"{conn.provider.capitalize()} synced successfully",
        invoices_synced=inv_count,
        clients_synced=client_count,
    )


@router.delete("/{connection_id}")
def disconnect_connection(
    connection_id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    conn = db.query(Connection).filter(Connection.id == connection_id, Connection.org_id == org.id).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")

    conn.status = "disconnected"
    db.commit()
    return {"message": "Connection disconnected successfully"}
