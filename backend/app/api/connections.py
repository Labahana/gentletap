import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.connection import Connection
from app.schemas.connection import ConnectionOut, SyncResponse
from app.services.quickbooks import get_qbo_auth_url, exchange_qbo_code, sync_qbo_data
from app.services.freshbooks import get_freshbooks_auth_url, exchange_freshbooks_code, sync_freshbooks_data
from app.services.google_gmail import get_google_gmail_auth_url, exchange_google_code

router = APIRouter(prefix="/connections", tags=["Connections"])


@router.get("", response_model=List[ConnectionOut])
def list_connections(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    return db.query(Connection).filter(Connection.org_id == org.id).all()


@router.post("/quickbooks/auth-url")
def quickbooks_auth_url(user_and_org=Depends(get_current_user_and_org)):
    _, org = user_and_org
    state = f"qbo_state_{org.id}"
    url = get_qbo_auth_url(state)
    return {"url": url}


@router.get("/quickbooks/callback")
def quickbooks_callback(
    code: str = Query("mock_code"),
    realmId: str = Query("mock_realm_id"),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    token_data = exchange_qbo_code(code, realmId)

    conn = db.query(Connection).filter(
        Connection.org_id == org.id, Connection.provider == "quickbooks"
    ).first()

    if not conn:
        conn = Connection(
            org_id=org.id,
            provider="quickbooks",
            token_encrypted=token_data.get("access_token", ""),
            refresh_token_encrypted=token_data.get("refresh_token", ""),
            realm_id=token_data.get("realm_id", realmId),
            status="active",
        )
        db.add(conn)
    else:
        conn.token_encrypted = token_data.get("access_token", "")
        conn.refresh_token_encrypted = token_data.get("refresh_token", "")
        conn.realm_id = token_data.get("realm_id", realmId)
        conn.status = "active"

    db.commit()
    db.refresh(conn)

    inv_count, client_count = sync_qbo_data(db, org.id, conn)

    return {
        "message": "QuickBooks connected successfully",
        "connection_id": conn.id,
        "invoices_synced": inv_count,
        "clients_synced": client_count,
    }


@router.post("/freshbooks/auth-url")
def freshbooks_auth_url(user_and_org=Depends(get_current_user_and_org)):
    _, org = user_and_org
    state = f"fb_state_{org.id}"
    url = get_freshbooks_auth_url(state)
    return {"url": url}


@router.get("/freshbooks/callback")
def freshbooks_callback(
    code: str = Query("mock_code"),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    token_data = exchange_freshbooks_code(code)

    conn = db.query(Connection).filter(
        Connection.org_id == org.id, Connection.provider == "freshbooks"
    ).first()

    if not conn:
        conn = Connection(
            org_id=org.id,
            provider="freshbooks",
            token_encrypted=token_data.get("access_token", ""),
            refresh_token_encrypted=token_data.get("refresh_token", ""),
            account_id=token_data.get("account_id", "fb_account_1"),
            status="active",
        )
        db.add(conn)
    else:
        conn.token_encrypted = token_data.get("access_token", "")
        conn.refresh_token_encrypted = token_data.get("refresh_token", "")
        conn.account_id = token_data.get("account_id", "fb_account_1")
        conn.status = "active"

    db.commit()
    db.refresh(conn)

    inv_count, client_count = sync_freshbooks_data(db, org.id, conn)

    return {
        "message": "FreshBooks connected successfully",
        "connection_id": conn.id,
        "invoices_synced": inv_count,
        "clients_synced": client_count,
    }


@router.post("/google/auth-url")
def google_auth_url(user_and_org=Depends(get_current_user_and_org)):
    _, org = user_and_org
    state = f"google_state_{org.id}"
    url = get_google_gmail_auth_url(state)
    return {"url": url}


@router.get("/google/callback")
def google_callback(
    code: str = Query("mock_code"),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    token_data = exchange_google_code(code)

    conn = db.query(Connection).filter(
        Connection.org_id == org.id, Connection.provider == "gmail"
    ).first()

    if not conn:
        conn = Connection(
            org_id=org.id,
            provider="gmail",
            token_encrypted=token_data.get("access_token", ""),
            refresh_token_encrypted=token_data.get("refresh_token", ""),
            account_id=token_data.get("email", "user@gmail.com"),
            status="active",
        )
        db.add(conn)
    else:
        conn.token_encrypted = token_data.get("access_token", "")
        conn.refresh_token_encrypted = token_data.get("refresh_token", "")
        conn.account_id = token_data.get("email", "user@gmail.com")
        conn.status = "active"

    db.commit()
    db.refresh(conn)

    return {
        "message": "Gmail account connected successfully via Google OAuth",
        "connection_id": conn.id,
        "connected_email": conn.account_id,
    }


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
