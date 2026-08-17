import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple, Optional
import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.connection import Connection
from app.models.client import Client
from app.models.invoice import Invoice

logger = logging.getLogger(__name__)
settings = get_settings()

FRESHBOOKS_AUTH_URL = "https://auth.freshbooks.com/service/auth/oauth/authorize"
FRESHBOOKS_TOKEN_URL = "https://api.freshbooks.com/auth/oauth/token"
FRESHBOOKS_API_BASE = "https://api.freshbooks.com/accounting/account"


def get_freshbooks_auth_url(state: str) -> str:
    params = {
        "client_id": settings.freshbooks_client_id or "MOCK_FB_CLIENT_ID",
        "response_type": "code",
        "redirect_uri": settings.freshbooks_redirect_uri,
        "state": state,
    }
    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{FRESHBOOKS_AUTH_URL}?{query_str}"


def exchange_freshbooks_code(code: str) -> Dict[str, Any]:
    if not settings.freshbooks_client_id or settings.freshbooks_client_id.startswith("MOCK"):
        return {
            "access_token": "mock_fb_access_token",
            "refresh_token": "mock_fb_refresh_token",
            "expires_in": 3600,
            "account_id": "mock_fb_account_123",
        }

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": settings.freshbooks_client_id,
        "client_secret": settings.freshbooks_client_secret,
        "redirect_uri": settings.freshbooks_redirect_uri,
    }
    with httpx.Client() as client:
        response = client.post(FRESHBOOKS_TOKEN_URL, json=data)
        response.raise_for_status()
        return response.json()


def sync_freshbooks_data(db: Session, org_id: str, connection: Connection) -> Tuple[int, int]:
    """
    Sync clients and outstanding invoices from FreshBooks.
    Return (invoices_synced, clients_synced) count.
    """
    if connection.token_encrypted == "mock_fb_access_token":
        mock_client = db.query(Client).filter(Client.org_id == org_id, Client.name == "Starlight Design Studio (FreshBooks)").first()
        if not mock_client:
            mock_client = Client(
                org_id=org_id,
                external_client_id="FB_CLIENT_99",
                name="Starlight Design Studio (FreshBooks)",
                email="accounts@starlightdesign.io",
                phone="+1-555-0821",
                currency="USD",
            )
            db.add(mock_client)
            db.commit()
            db.refresh(mock_client)

        mock_inv = db.query(Invoice).filter(Invoice.org_id == org_id, Invoice.number == "FB-2024-008").first()
        if not mock_inv:
            mock_inv = Invoice(
                org_id=org_id,
                connection_id=connection.id,
                external_id="FB_INV_2024_008",
                number="FB-2024-008",
                client_id=mock_client.id,
                amount=3800.00,
                balance=3800.00,
                currency="USD",
                due_date=datetime.now().date() - timedelta(days=21),
                issue_date=datetime.now().date() - timedelta(days=51),
                status="unpaid",
                imported_from="freshbooks",
            )
            db.add(mock_inv)

        connection.last_sync_at = datetime.now(timezone.utc)
        connection.status = "active"
        db.commit()
        return (1, 1)

    # Real FreshBooks sync if live credentials available
    headers = {
        "Authorization": f"Bearer {connection.token_encrypted}",
        "Content-Type": "application/json",
    }
    account_id = connection.account_id or ""
    clients_synced = 0
    invoices_synced = 0

    try:
        with httpx.Client() as client:
            # Sync Clients
            clients_url = f"{FRESHBOOKS_API_BASE}/{account_id}/users/clients"
            res = client.get(clients_url, headers=headers)
            if res.status_code == 200:
                clients_list = res.json().get("response", {}).get("result", {}).get("clients", [])
                for fb_c in clients_list:
                    ext_id = str(fb_c.get("userid") or fb_c.get("id"))
                    name = f"{fb_c.get('fname', '')} {fb_c.get('lname', '')}".strip() or fb_c.get("organization") or "FreshBooks Client"
                    email = fb_c.get("email")

                    db_c = db.query(Client).filter(Client.org_id == org_id, Client.external_client_id == ext_id).first()
                    if not db_c:
                        db_c = Client(
                            org_id=org_id,
                            external_client_id=ext_id,
                            name=name,
                            email=email,
                        )
                        db.add(db_c)
                        clients_synced += 1
                db.commit()

            # Sync Invoices
            inv_url = f"{FRESHBOOKS_API_BASE}/{account_id}/invoices/invoices"
            res = client.get(inv_url, headers=headers)
            if res.status_code == 200:
                inv_list = res.json().get("response", {}).get("result", {}).get("invoices", [])
                for fb_i in inv_list:
                    ext_id = str(fb_i.get("invoiceid") or fb_i.get("id"))
                    num = fb_i.get("invoice_number") or f"FB-{ext_id}"
                    amt = float(fb_i.get("amount", {}).get("amount", 0))
                    balance = float(fb_i.get("outstanding", {}).get("amount", amt))

                    if balance > 0:
                        db_inv = db.query(Invoice).filter(Invoice.org_id == org_id, Invoice.external_id == ext_id).first()
                        if not db_inv:
                            db_c = db.query(Client).filter(Client.org_id == org_id).first()
                            if db_c:
                                db_inv = Invoice(
                                    org_id=org_id,
                                    connection_id=connection.id,
                                    external_id=ext_id,
                                    number=num,
                                    client_id=db_c.id,
                                    amount=amt,
                                    balance=balance,
                                    currency="USD",
                                    status="unpaid",
                                    imported_from="freshbooks",
                                )
                                db.add(db_inv)
                                invoices_synced += 1
                db.commit()

        connection.last_sync_at = datetime.now(timezone.utc)
        connection.status = "active"
        db.commit()
    except Exception as e:
        logger.error(f"Error syncing FreshBooks: {e}")
        db.rollback()
        raise e

    return (invoices_synced, clients_synced)
