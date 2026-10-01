import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Tuple, Optional
import httpx
from urllib.parse import urlencode
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.connection import Connection
from app.models.client import Client
from app.models.invoice import Invoice
from app.services.payment_detect import detect_and_stop_if_paid

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
    query_str = urlencode(params)
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


def _fb_phone(fb_c: Dict[str, Any]):
    """Best-effort mobile/phone extraction across FreshBooks client payload shapes."""
    for key in ("mobile", "phone", "cell_phone", "bus_phone", "home_phone"):
        val = fb_c.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    # v2.0 nests numbers as a list of {type, rating, value}.
    numbers = fb_c.get("numbers")
    if isinstance(numbers, list):
        primary = None
        for entry in numbers:
            if not isinstance(entry, dict):
                continue
            value = entry.get("value")
            if not (isinstance(value, str) and value.strip()):
                continue
            if entry.get("type") == "mobile":
                return value.strip()
            primary = primary or value.strip()
        return primary
    return None


def sync_freshbooks_data(db: Session, org_id: str, connection: Connection) -> Tuple[int, int]:
    """
    Sync clients and outstanding invoices from FreshBooks.
    Return (invoices_synced, clients_synced) count.
    """
    from app.services.crypto import decrypt_secret

    access_token = decrypt_secret(connection.token_encrypted)

    if access_token == "mock_fb_access_token":
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
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }
    account_id = connection.account_id or ""
    clients_synced = 0
    invoices_synced = 0

    def _paged(url: str, result_key: str):
        """Yield items from a FreshBooks list endpoint, following pagination.

        Fails LOUD: a non-200 means the sync did NOT happen, so we must not let
        the caller mark the connection active/successful on an empty result.
        """
        page = 1
        per_page = 100
        while True:
            res = client.get(url, headers=headers, params={"per_page": per_page, "page": page})
            if res.status_code == 401:
                connection.status = "expired"
                db.commit()
                raise RuntimeError("FreshBooks access token expired (401)")
            if res.status_code != 200:
                raise RuntimeError(f"FreshBooks query failed: HTTP {res.status_code}")
            result = res.json().get("response", {}).get("result", {})
            items = result.get(result_key, [])
            for item in items:
                yield item
            total = int(result.get("total_items") or result.get("total") or 0)
            if not items or page * per_page >= total:
                return
            page += 1

    try:
        with httpx.Client() as client:
            # Sync Clients
            clients_url = f"{FRESHBOOKS_API_BASE}/{account_id}/users/clients"
            for fb_c in _paged(clients_url, "clients"):
                ext_id = str(fb_c.get("client_id") or fb_c.get("userid") or fb_c.get("id") or "")
                if not ext_id:
                    continue
                name = fb_c.get("organization") or f"{fb_c.get('first_name', fb_c.get('fname', ''))} {fb_c.get('last_name', fb_c.get('lname', ''))}".strip() or "FreshBooks Client"
                email = fb_c.get("email")
                phone = _fb_phone(fb_c)

                db_c = db.query(Client).filter(Client.org_id == org_id, Client.external_client_id == ext_id).first()
                if not db_c:
                    db_c = Client(
                        org_id=org_id,
                        external_client_id=ext_id,
                        name=name,
                        email=email,
                        phone=phone,
                    )
                    db.add(db_c)
                    clients_synced += 1
                else:
                    db_c.name = name
                    if email:
                        db_c.email = email
                    if phone:
                        db_c.phone = phone
            db.commit()

            # Sync Invoices
            inv_url = f"{FRESHBOOKS_API_BASE}/{account_id}/invoices/invoices"
            for fb_i in _paged(inv_url, "invoices"):
                ext_id = str(fb_i.get("invoiceid") or fb_i.get("id") or "")
                if not ext_id:
                    continue
                num = fb_i.get("invoice_number") or f"FB-{ext_id}"
                amt = float(fb_i.get("amount", {}).get("amount", 0))
                balance = float(fb_i.get("outstanding", {}).get("amount", amt))
                fb_status = (fb_i.get("status") or "").lower()

                db_inv = db.query(Invoice).filter(Invoice.org_id == org_id, Invoice.external_id == ext_id).first()
                if db_inv:
                    db_inv.balance = balance
                    db_inv.amount = amt
                    # Route the paid transition through the shared auto-stop so
                    # pending reminders are cancelled, a Payout + audit land, and
                    # the client profile is recomputed — not just a bare status flip.
                    if balance <= 0 or fb_status == "paid":
                        detect_and_stop_if_paid(db, db_inv, method="freshbooks_sync")
                    elif db_inv.status == "paid":
                        db_inv.status = "unpaid"
                    continue

                if balance <= 0:
                    continue

                fb_client_id = str(fb_i.get("client_id") or "")
                db_c = db.query(Client).filter(Client.org_id == org_id, Client.external_client_id == fb_client_id).first()
                if not db_c:
                    db_c = Client(
                        org_id=org_id,
                        external_client_id=fb_client_id or f"FB_UNKNOWN_{ext_id}",
                        name="FreshBooks Client",
                    )
                    db.add(db_c)
                    db.flush()
                    clients_synced += 1

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
