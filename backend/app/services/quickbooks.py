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

QBO_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com"
QBO_PRODUCTION_BASE = "https://quickbooks.api.intuit.com"
QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
QBO_TOKEN_URL = "https://oauth.platform.intuit.com/op/v1/token"


def get_qbo_auth_url(state: str) -> str:
    params = {
        "client_id": settings.quickbooks_client_id or "MOCK_QBO_CLIENT_ID",
        "response_type": "code",
        "scope": "com.intuit.quickbooks.accounting",
        "redirect_uri": settings.quickbooks_redirect_uri,
        "state": state,
    }
    query_str = "&".join(f"{k}={v}" for k, v in params.items())
    return f"{QBO_AUTH_URL}?{query_str}"


def exchange_qbo_code(code: str, realm_id: str) -> Dict[str, Any]:
    # Mock fallback if no client credentials set for local dev testing
    if not settings.quickbooks_client_id or settings.quickbooks_client_id.startswith("MOCK"):
        return {
            "access_token": "mock_qbo_access_token",
            "refresh_token": "mock_qbo_refresh_token",
            "expires_in": 3600,
            "realm_id": realm_id,
        }

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.quickbooks_redirect_uri,
    }
    auth = (settings.quickbooks_client_id, settings.quickbooks_client_secret)
    with httpx.Client() as client:
        response = client.post(QBO_TOKEN_URL, data=data, auth=auth)
        response.raise_for_status()
        res_data = response.json()
        res_data["realm_id"] = realm_id
        return res_data


def sync_qbo_data(db: Session, org_id: str, connection: Connection) -> Tuple[int, int]:
    """
    Sync customers and unpaid invoices from QuickBooks.
    Return (invoices_synced, clients_synced) count.
    """
    # For dev / mock mode fallback when tokens are mock
    if connection.token_encrypted == "mock_qbo_access_token":
        # Create a sample customer and invoice to demonstrate live sync capability
        mock_client = db.query(Client).filter(Client.org_id == org_id, Client.name == "Acme Corp (QBO)").first()
        if not mock_client:
            mock_client = Client(
                org_id=org_id,
                external_client_id="QBO_CUST_101",
                name="Acme Corp (QBO)",
                email="billing@acmecorp.com",
                phone="+1-555-0192",
                currency="USD",
            )
            db.add(mock_client)
            db.commit()
            db.refresh(mock_client)

        mock_inv = db.query(Invoice).filter(Invoice.org_id == org_id, Invoice.number == "INV-QBO-1001").first()
        if not mock_inv:
            mock_inv = Invoice(
                org_id=org_id,
                connection_id=connection.id,
                external_id="QBO_INV_1001",
                number="INV-QBO-1001",
                client_id=mock_client.id,
                amount=2450.00,
                balance=2450.00,
                currency="USD",
                due_date=datetime.now().date() - timedelta(days=14),
                issue_date=datetime.now().date() - timedelta(days=44),
                status="unpaid",
                imported_from="quickbooks",
            )
            db.add(mock_inv)

        connection.last_sync_at = datetime.now(timezone.utc)
        connection.status = "active"
        db.commit()
        return (1, 1)

    # Real QBO API Call if access token present
    base_url = QBO_SANDBOX_BASE if settings.quickbooks_environment == "sandbox" else QBO_PRODUCTION_BASE
    realm_id = connection.realm_id or ""

    headers = {
        "Authorization": f"Bearer {connection.token_encrypted}",
        "Accept": "application/json",
    }

    clients_synced = 0
    invoices_synced = 0

    try:
        with httpx.Client() as client:
            # Query Customers
            cust_url = f"{base_url}/v3/company/{realm_id}/query?query=select * from Customer maxresults 500"
            res = client.get(cust_url, headers=headers)
            if res.status_code == 200:
                cust_data = res.json().get("QueryResponse", {}).get("Customer", [])
                for cust in cust_data:
                    ext_id = str(cust.get("Id"))
                    name = cust.get("DisplayName") or cust.get("CompanyName") or "Unknown QBO Client"
                    email = cust.get("PrimaryEmailAddr", {}).get("Address")
                    phone = cust.get("PrimaryPhone", {}).get("FreeFormNumber")

                    db_client = db.query(Client).filter(Client.org_id == org_id, Client.external_client_id == ext_id).first()
                    if not db_client:
                        db_client = Client(
                            org_id=org_id,
                            external_client_id=ext_id,
                            name=name,
                            email=email,
                            phone=phone,
                        )
                        db.add(db_client)
                        clients_synced += 1
                    else:
                        db_client.name = name
                        if email: db_client.email = email
                        if phone: db_client.phone = phone
                db.commit()

            # Query Unpaid Invoices
            inv_url = f"{base_url}/v3/company/{realm_id}/query?query=select * from Invoice where Balance > '0' maxresults 500"
            res = client.get(inv_url, headers=headers)
            if res.status_code == 200:
                inv_data = res.json().get("QueryResponse", {}).get("Invoice", [])
                for inv in inv_data:
                    ext_id = str(inv.get("Id"))
                    doc_num = inv.get("DocNumber") or f"INV-{ext_id}"
                    cust_ref = str(inv.get("CustomerRef", {}).get("value"))
                    total_amt = float(inv.get("TotalAmt", 0))
                    balance = float(inv.get("Balance", 0))

                    db_client = db.query(Client).filter(Client.org_id == org_id, Client.external_client_id == cust_ref).first()
                    if not db_client:
                        db_client = db.query(Client).filter(Client.org_id == org_id).first()

                    if db_client:
                        db_inv = db.query(Invoice).filter(Invoice.org_id == org_id, Invoice.external_id == ext_id).first()
                        if not db_inv:
                            db_inv = Invoice(
                                org_id=org_id,
                                connection_id=connection.id,
                                external_id=ext_id,
                                number=doc_num,
                                client_id=db_client.id,
                                amount=total_amt,
                                balance=balance,
                                currency="USD",
                                status="unpaid",
                                imported_from="quickbooks",
                            )
                            db.add(db_inv)
                            invoices_synced += 1
                        else:
                            db_inv.balance = balance
                            db_inv.amount = total_amt
                db.commit()

        connection.last_sync_at = datetime.now(timezone.utc)
        connection.status = "active"
        db.commit()
    except Exception as e:
        logger.error(f"Error syncing QuickBooks: {e}")
        db.rollback()
        raise e

    return (invoices_synced, clients_synced)
