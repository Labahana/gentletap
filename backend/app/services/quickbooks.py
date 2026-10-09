import logging
import re
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

QBO_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com"
QBO_PRODUCTION_BASE = "https://quickbooks.api.intuit.com"
QBO_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
QBO_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"

# QBO object ids are short alphanumeric refs; they are interpolated into a QBO SQL
# statement, so anything else is refused rather than escaped.
_QBO_ID_RE = re.compile(r"[A-Za-z0-9_-]{1,64}")

# Window floor: the first real sync starts here, and an idle connection never asks
# for more — the query caps at 500 rows, so a huge window spends the cap on old data.
FIRST_PAID_LOOKBACK = timedelta(days=45)
# QBO reads the timestamp in the query against the realm's own clock, so a plain
# "since last sync" window can silently start hours late. Overlap more than any
# UTC offset to make that impossible; the pass is idempotent, so re-reading rows
# costs nothing.
PAID_WINDOW_OVERLAP = timedelta(hours=26)


class QboAuthExpired(RuntimeError):
    """Access token rejected by QBO (401) — the connection must be marked expired."""


def _qbo_query(
    client,
    base_url: str,
    realm_id: str,
    headers: dict,
    query: str,
    entity: str,
) -> list:
    """Run one QBO SQL query and return the entity rows.

    Raises on 401 and on any other non-200: a failed query must never look like a
    successful-but-empty sync, or the connection gets marked active on stale data.
    """
    res = client.get(f"{base_url}/v3/company/{realm_id}/query?query={query}", headers=headers)
    if res.status_code == 401:
        raise QboAuthExpired("QuickBooks access token expired (401)")
    if res.status_code != 200:
        raise RuntimeError(f"QuickBooks {entity} query failed: HTTP {res.status_code}")
    return res.json().get("QueryResponse", {}).get(entity, [])


def _qbo_date(val):
    s = (val or "")[:10]
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        return None


def _qbo_paid_at(inv: Dict[str, Any]) -> Optional[datetime]:
    raw = inv.get("PaidDate")
    if not isinstance(raw, str) or not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def _qbo_modified_since(connection: Connection) -> datetime:
    now = datetime.now(timezone.utc)
    since = connection.last_sync_at
    if since is None:
        return now - FIRST_PAID_LOOKBACK
    if since.tzinfo is None:
        since = since.replace(tzinfo=timezone.utc)
    # Clamp the window: an idle connection could otherwise ask for months of
    # changes, and the 500-row cap would spend itself on the oldest ones.
    return max(since - PAID_WINDOW_OVERLAP, now - FIRST_PAID_LOOKBACK)


def _reconcile_qbo_rows(db: Session, org_id: str, rows: list) -> int:
    """Apply provider-side changes to invoices we already track; never creates rows.

    This pass exists because the discovery query (`Balance > '0'`) structurally
    cannot return an invoice that has been paid: without it, QuickBooks payments
    go unnoticed and reminders keep chasing a settled invoice.
    """
    reconciled = 0
    for inv in rows:
        ext_id = str(inv.get("Id") or "")
        if not ext_id:
            continue
        db_inv = (
            db.query(Invoice)
            .filter(Invoice.org_id == org_id, Invoice.external_id == ext_id)
            .first()
        )
        if not db_inv:
            continue

        balance = float(inv.get("Balance", 0) or 0)
        total = float(inv.get("TotalAmt", 0) or 0)
        db_inv.balance = balance
        if total:
            db_inv.amount = total
        paid_at = _qbo_paid_at(inv)
        # auto_stop keeps an existing paid_at, so seeding it here records the real
        # settlement date instead of the moment the sync happened to run.
        if paid_at and balance <= 0 and db_inv.status != "paid":
            db_inv.paid_at = paid_at
        reconciled += 1

        if balance <= 0:
            detect_and_stop_if_paid(db, db_inv, method="quickbooks_sync")
        elif db_inv.status == "paid":
            # Payment reversed / credit-noted in QuickBooks: reopen and let the
            # autopilot reconciler revive the cancelled jobs.
            db_inv.status = "unpaid"
            db_inv.stop_reminders = False
            db_inv.paid_at = None
    return reconciled


def get_qbo_auth_url(state: str) -> str:
    params = {
        "client_id": settings.quickbooks_client_id or "MOCK_QBO_CLIENT_ID",
        "response_type": "code",
        "scope": "com.intuit.quickbooks.accounting",
        "redirect_uri": settings.quickbooks_redirect_uri,
        "state": state,
    }
    query_str = urlencode(params)
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
    Sync customers and unpaid invoices from QuickBooks, then reconcile every
    recently-modified invoice so payments the discovery query can't return still
    stop the chase. Return (invoices_synced, clients_synced) count.
    """
    from app.services.crypto import decrypt_secret

    access_token = decrypt_secret(connection.token_encrypted)

    # For dev / mock mode fallback when tokens are mock
    if access_token == "mock_qbo_access_token":
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
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    clients_synced = 0
    invoices_synced = 0

    try:
        with httpx.Client() as client:
            # Query Customers
            cust_data = _qbo_query(
                client, base_url, realm_id, headers,
                "select * from Customer maxresults 500", "Customer",
            )
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
            inv_data = _qbo_query(
                client, base_url, realm_id, headers,
                "select * from Invoice where Balance > '0' maxresults 500", "Invoice",
            )
            for inv in inv_data:
                ext_id = str(inv.get("Id"))
                doc_num = inv.get("DocNumber") or f"INV-{ext_id}"
                cust_ref = inv.get("CustomerRef") or {}
                cust_ref_id = str(cust_ref.get("value") or "")
                cust_ref_name = cust_ref.get("name") or "Unknown QBO Client"
                total_amt = float(inv.get("TotalAmt", 0))
                balance = float(inv.get("Balance", 0))

                # QB hosts a pay/PDF URL on the invoice; use it as the reminder pay-link.
                qbo_link = inv.get("InvoiceLink")
                pay_link = qbo_link if isinstance(qbo_link, str) and qbo_link.startswith(("http://", "https://")) else None

                due_d = _qbo_date(inv.get("DueDate"))
                issue_d = _qbo_date(inv.get("TxnDate"))

                db_client = db.query(Client).filter(Client.org_id == org_id, Client.external_client_id == cust_ref_id).first()
                if not db_client:
                    db_client = Client(
                        org_id=org_id,
                        external_client_id=cust_ref_id,
                        name=cust_ref_name,
                    )
                    db.add(db_client)
                    db.flush()
                    clients_synced += 1

                if cust_ref_id:
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
                            due_date=due_d,
                            issue_date=issue_d,
                            payment_link=pay_link,
                        )
                        db.add(db_inv)
                        invoices_synced += 1
                    else:
                        db_inv.balance = balance
                        db_inv.amount = total_amt
                        if due_d:
                            db_inv.due_date = due_d
                        if issue_d:
                            db_inv.issue_date = issue_d
                        if pay_link:
                            db_inv.payment_link = pay_link
                        # This query only returns Balance > '0', so a row we hold as
                        # paid must have been reopened upstream (reversal / credit note).
                        if db_inv.status == "paid":
                            db_inv.status = "unpaid"
                            db_inv.stop_reminders = False
                            db_inv.paid_at = None
            db.commit()

            # Recently-modified pass: catches the payments discovery cannot see.
            _qbo_paid_discovery(db, org_id, connection, client, base_url, realm_id, headers)

        connection.last_sync_at = datetime.now(timezone.utc)
        connection.status = "active"
        db.commit()
    except QboAuthExpired as e:
        db.rollback()
        connection.status = "expired"
        db.commit()
        logger.error("QuickBooks sync aborted: %s", e)
        raise RuntimeError(str(e))
    except Exception as e:
        logger.error(f"Error syncing QuickBooks: {e}")
        db.rollback()
        raise e

    return (invoices_synced, clients_synced)


def _qbo_paid_discovery(db, org_id, connection, client, base_url, realm_id, headers) -> int:
    """Reconcile invoices the ledger reports as recently modified.

    The discovery query cannot return a paid invoice, so this window is what makes
    QuickBooks payments visible at all. A query rejection (QBO SQL is strict about
    `MetaData` fields) must not take the working half of the sync down with it —
    the unpaid rows are already committed — so it is logged, not raised. An expired
    token still propagates: nothing after it can succeed either.
    """
    since = _qbo_modified_since(connection)
    since_sql = since.strftime("%Y-%m-%dT%H:%M:%S")
    try:
        recent = _qbo_query(
            client, base_url, realm_id, headers,
            f"select * from Invoice where MetaData.LastUpdatedTime >= '{since_sql}' maxresults 500",
            "Invoice",
        )
        reconciled = _reconcile_qbo_rows(db, org_id, recent)
        db.commit()
    except QboAuthExpired:
        raise
    except Exception as exc:  # noqa: BLE001 — degrade to the previous sync behaviour
        db.rollback()
        logger.error("QuickBooks paid-discovery FAILED since %s: %s", since_sql, exc)
        return 0

    logger.info(
        "QuickBooks paid-discovery: %d row(s) modified since %s, %d tracked invoice(s) reconciled",
        len(recent),
        since_sql,
        reconciled,
    )
    return reconciled


def fetch_qbo_invoice_state(db: Session, connection: Connection, external_id: str) -> Optional[Dict[str, Any]]:
    """Authoritative single-invoice read straight from QuickBooks.

    Webhook payloads carry no trustworthy balance, and the sync only reflects the
    last window it pulled — so a payment signal must be re-read from the ledger
    before we stop chasing. Returns None when there is nothing authoritative to
    say (mock token, unusable id, invoice gone, provider error).
    """
    from app.services.crypto import decrypt_secret

    if not external_id or not _QBO_ID_RE.fullmatch(str(external_id)):
        return None

    access_token = decrypt_secret(connection.token_encrypted)
    if access_token == "mock_qbo_access_token":
        return None

    base_url = QBO_SANDBOX_BASE if settings.quickbooks_environment == "sandbox" else QBO_PRODUCTION_BASE
    realm_id = connection.realm_id or ""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    try:
        with httpx.Client() as client:
            rows = _qbo_query(
                client, base_url, realm_id, headers,
                f"select * from Invoice where Id = '{external_id}' maxresults 1",
                "Invoice",
            )
    except QboAuthExpired as e:
        connection.status = "expired"
        db.commit()
        logger.warning("QuickBooks invoice read aborted for %s: %s", external_id, e)
        return None
    except Exception as exc:  # noqa: BLE001 — never fail the caller on a provider hiccup
        db.rollback()
        logger.warning("QuickBooks invoice read failed for %s: %s", external_id, exc)
        return None

    if not rows:
        return None

    inv = rows[0]
    balance = float(inv.get("Balance", 0) or 0)
    total = float(inv.get("TotalAmt", 0) or 0)
    pay_link = inv.get("InvoiceLink")
    return {
        "balance": balance,
        "amount": total,
        "paid_at": _qbo_paid_at(inv),
        "payment_link": pay_link if isinstance(pay_link, str) and pay_link.startswith(("http://", "https://")) else None,
    }
