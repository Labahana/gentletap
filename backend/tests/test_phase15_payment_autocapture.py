"""Payment auto-capture: QuickBooks paid-discovery, authoritative per-invoice
provider re-checks for webhooks, and PATCH status=paid going through auto-stop."""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("PADDLE_API_KEY", "test")
os.environ.setdefault("PADDLE_CLIENT_TOKEN", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.api import webhooks as webhooks_module
from app.api.invoices import update_invoice
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.connection import Connection
from app.models.invoice import Invoice
from app.models.organization import Organization
from app.models.payout import Payout
from app.models.reminder_schedule import ReminderSchedule
from app.models.user import User
from app.schemas.invoice import InvoiceUpdate
from app.services import freshbooks, payment_detect, quickbooks
from app.services.crypto import encrypt_secret

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def override_get_db():
    try:
        s = TestingSessionLocal()
        yield s
    finally:
        s.close()


def _seed(db, provider="quickbooks", token="real_qbo"):
    stamp = datetime.now(timezone.utc).timestamp()
    user = User(email=f"u{stamp}@t.com", full_name="U", password_hash="x")
    db.add(user)
    db.flush()
    org = Organization(name="Org", owner_user_id=user.id, plan="pro_plus")
    db.add(org)
    db.flush()
    conn = Connection(
        org_id=org.id,
        provider=provider,
        realm_id="r1",
        account_id="acct1",
        token_encrypted=encrypt_secret(token),
        refresh_token_encrypted=encrypt_secret("refresh"),
        status="active",
        last_sync_at=datetime(2026, 10, 8, tzinfo=timezone.utc),
    )
    db.add(conn)
    db.flush()
    client = Client(org_id=org.id, name="Payer", email="p@t.com", external_client_id="cust1")
    db.add(client)
    db.flush()
    return user, org, conn, client


def _invoice(db, org, conn, client, *, balance=300.0, status="chasing", external_id="inv77"):
    inv = Invoice(
        org_id=org.id,
        connection_id=conn.id,
        external_id=external_id,
        number="Q-77",
        client_id=client.id,
        amount=300.0,
        balance=balance,
        status=status,
        imported_from=conn.provider,
    )
    db.add(inv)
    db.flush()
    sched = ReminderSchedule(
        invoice_id=inv.id,
        org_id=org.id,
        step_index=2,
        scheduled_at=datetime.now(timezone.utc) + timedelta(days=1),
        tone="gentle",
        status="pending",
    )
    db.add(sched)
    db.flush()
    return inv


class _Resp:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class _FakeClient:
    """Marker-ordered stub: the first marker contained in the URL wins, so routes
    that are substrings of each other must be inserted most-specific-first."""

    def __init__(self, routes):
        self._routes = routes
        self.calls = []

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def get(self, url, headers=None, params=None):
        self.calls.append(url)
        for marker, resp in self._routes.items():
            if marker in url:
                return resp
        raise AssertionError(f"unexpected GET {url}")


def _qbo_rows(invoices):
    return _Resp({"QueryResponse": {"Invoice": invoices}})


EMPTY_CUSTOMERS = _Resp({"QueryResponse": {"Customer": []}})


# --------------------------------------------------------------------------
# QuickBooks recently-paid discovery
# --------------------------------------------------------------------------
class TestQuickBooksPaidDiscovery:
    def test_recently_paid_invoice_stops_chasing(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client)

        paid = _qbo_rows([
            {"Id": "inv77", "DocNumber": "Q-77", "TotalAmt": 300, "Balance": 0,
             "PaidDate": "2026-10-08T09:30:00-04:00", "CustomerRef": {"value": "cust1"}},
        ])
        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "from Customer": EMPTY_CUSTOMERS,
            "MetaData.LastUpdatedTime": paid,
            "Balance >": _qbo_rows([]),
        }))

        quickbooks.sync_qbo_data(db, org.id, conn)

        db.refresh(inv)
        assert inv.status == "paid"
        assert float(inv.balance) == 0
        assert inv.stop_reminders is True
        assert (inv.paid_at.year, inv.paid_at.month, inv.paid_at.day) == (2026, 10, 8)
        sched = db.query(ReminderSchedule).filter(ReminderSchedule.invoice_id == inv.id).one()
        assert sched.status == "cancelled"
        assert sched.skip_reason == "payment_detected"
        payout = db.query(Payout).filter(Payout.invoice_id == inv.id).one()
        assert payout.method == "quickbooks_sync"

    def test_already_settled_invoice_is_not_re_audited(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client, balance=0.0, status="paid")
        inv.stop_reminders = True
        db.commit()

        paid = _qbo_rows([
            {"Id": "inv77", "TotalAmt": 300, "Balance": 0, "CustomerRef": {"value": "cust1"}},
        ])
        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "from Customer": EMPTY_CUSTOMERS,
            "MetaData.LastUpdatedTime": paid,
            "Balance >": _qbo_rows([]),
        }))

        quickbooks.sync_qbo_data(db, org.id, conn)

        assert db.query(AuditLog).filter(AuditLog.action == "auto_stop_reminders").count() == 0

    def test_reopened_in_ledger_resumes_chasing(self, db, monkeypatch):
        """A reversal/credit note puts Balance back above zero: the discovery query
        returns it, and a locally-paid row must be reopened (and un-stopped, or the
        autopilot reconciler would skip it forever)."""
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client, balance=0.0, status="paid")
        inv.stop_reminders = True
        db.commit()

        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "from Customer": EMPTY_CUSTOMERS,
            "MetaData.LastUpdatedTime": _qbo_rows([]),
            "Balance >": _qbo_rows([
                {"Id": "inv77", "TotalAmt": 300, "Balance": 300, "CustomerRef": {"value": "cust1"}},
            ]),
        }))

        quickbooks.sync_qbo_data(db, org.id, conn)

        db.refresh(inv)
        assert inv.status == "unpaid"
        assert inv.stop_reminders is False
        assert inv.paid_at is None

    def test_rejected_discovery_query_keeps_the_rest_of_sync(self, db, monkeypatch, caplog):
        """Paid-discovery is additive: a QBO rejection there must not undo the
        unpaid half that already landed, but it must be loud in the logs."""
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client)
        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "from Customer": EMPTY_CUSTOMERS,
            "MetaData.LastUpdatedTime": _Resp({}, status_code=400),
            "Balance >": _qbo_rows([
                {"Id": "inv77", "TotalAmt": 320, "Balance": 320, "CustomerRef": {"value": "cust1"}},
            ]),
        }))

        with caplog.at_level("ERROR"):
            quickbooks.sync_qbo_data(db, org.id, conn)

        db.refresh(inv)
        assert float(inv.balance) == 320  # discovery pass still applied
        assert inv.status == "chasing"
        db.refresh(conn)
        assert conn.status == "active"
        assert conn.last_sync_at is not None
        assert any("paid-discovery FAILED" in r.getMessage() for r in caplog.records)

    def test_expired_token_during_discovery_is_not_marked_active(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        _invoice(db, org, conn, client)
        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "from Customer": EMPTY_CUSTOMERS,
            "MetaData.LastUpdatedTime": _Resp({}, status_code=401),
            "Balance >": _qbo_rows([]),
        }))

        with pytest.raises(RuntimeError, match="QuickBooks access token expired"):
            quickbooks.sync_qbo_data(db, org.id, conn)

        db.refresh(conn)
        assert conn.status == "expired"


# --------------------------------------------------------------------------
# Authoritative single-invoice re-check (webhook path)
# --------------------------------------------------------------------------
class TestQboInvoiceRead:
    def test_zero_balance_from_ledger_stops_reminders(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client)
        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "where Id =": _qbo_rows([{"Id": "inv77", "TotalAmt": 300, "Balance": 0,
                                      "PaidDate": "2026-10-08T09:30:00-04:00"}]),
        }))

        result = payment_detect.refresh_invoice_from_provider(db, inv, method="webhook")
        db.commit()

        assert result["invoice_id"] == inv.id
        assert inv.status == "paid"
        assert float(inv.balance) == 0
        assert inv.paid_at is not None
        assert db.query(ReminderSchedule).filter(ReminderSchedule.invoice_id == inv.id).one().status == "cancelled"

    def test_nonzero_balance_reopens_a_locally_paid_invoice(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client, balance=0.0, status="paid")
        inv.stop_reminders = True
        db.commit()
        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "where Id =": _qbo_rows([{"Id": "inv77", "TotalAmt": 300, "Balance": 120}]),
        }))

        result = payment_detect.refresh_invoice_from_provider(db, inv, method="webhook")

        assert result == {"invoice_id": inv.id, "reopened": True}
        assert inv.status == "unpaid"
        assert inv.stop_reminders is False
        assert float(inv.balance) == 120

    def test_mock_token_has_no_authoritative_answer(self, db, monkeypatch):
        _, org, conn, client = _seed(db, token="mock_qbo_access_token")
        inv = _invoice(db, org, conn, client)
        calls = []
        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: calls.append(1))

        assert payment_detect.refresh_invoice_from_provider(db, inv, method="webhook") is None
        assert calls == []

    def test_unsafe_external_id_is_never_interpolated(self, db):
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client, external_id="1' or '1'='1")

        assert quickbooks.fetch_qbo_invoice_state(db, conn, inv.external_id) is None

    def test_401_marks_connection_expired_and_stays_nonfatal(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client)
        monkeypatch.setattr(quickbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "where Id =": _Resp({}, status_code=401),
        }))

        assert payment_detect.refresh_invoice_from_provider(db, inv, method="webhook") is None
        db.refresh(conn)
        assert conn.status == "expired"


class TestFreshBooksInvoiceRead:
    def test_paid_view_stops_reminders(self, db, monkeypatch):
        _, org, conn, client = _seed(db, provider="freshbooks", token="real_fb")
        inv = _invoice(db, org, conn, client, external_id="500")
        view = _Resp({"response": {"result": {"invoice": {
            "invoiceid": 500, "amount": {"amount": "300.00"},
            "outstanding": {"amount": "0.00"}, "status": "paid",
        }}}})
        monkeypatch.setattr(freshbooks.httpx, "Client", lambda *a, **k: _FakeClient({"invoices/view/500": view}))

        result = payment_detect.refresh_invoice_from_provider(db, inv, method="webhook")

        assert result["invoice_id"] == inv.id
        assert inv.status == "paid"
        assert db.query(Payout).filter(Payout.invoice_id == inv.id).one().method == "webhook"

    def test_reopened_after_payment_reversal(self, db, monkeypatch):
        _, org, conn, client = _seed(db, provider="freshbooks", token="real_fb")
        inv = _invoice(db, org, conn, client, balance=0.0, status="paid", external_id="500")
        inv.stop_reminders = True
        db.commit()
        view = _Resp({"response": {"result": {"invoice": {
            "invoiceid": 500, "amount": {"amount": "300.00"},
            "outstanding": {"amount": "300.00"}, "status": "unpaid",
        }}}})
        monkeypatch.setattr(freshbooks.httpx, "Client", lambda *a, **k: _FakeClient({"invoices/view/500": view}))

        result = payment_detect.refresh_invoice_from_provider(db, inv, method="webhook")

        assert result["reopened"] is True
        assert inv.status == "unpaid"
        assert inv.stop_reminders is False

    def test_404_is_not_a_payment(self, db, monkeypatch):
        _, org, conn, client = _seed(db, provider="freshbooks", token="real_fb")
        inv = _invoice(db, org, conn, client, external_id="500")
        monkeypatch.setattr(freshbooks.httpx, "Client", lambda *a, **k: _FakeClient({
            "invoices/view/500": _Resp({}, status_code=404),
        }))

        assert payment_detect.refresh_invoice_from_provider(db, inv, method="webhook") is None
        assert inv.status == "chasing"


class TestLocalFallback:
    def test_manual_invoice_has_no_provider_read(self, db):
        _, org, _, client = _seed(db)
        inv = Invoice(org_id=org.id, external_id=None, number="M-1", client_id=client.id,
                      amount=100, balance=0, status="unpaid", imported_from="manual")
        db.add(inv)
        db.flush()

        assert payment_detect.refresh_invoice_from_provider(db, inv) is None
        assert payment_detect.detect_and_stop_if_paid(db, inv, method="webhook")["invoice_id"] == inv.id


# --------------------------------------------------------------------------
# PATCH /invoices/{id} must not bypass the stop transition
# --------------------------------------------------------------------------
class TestInvoicePatchPaid:
    def test_status_paid_cancels_pending_reminders(self, db):
        user, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client, external_id="inv-patch")

        out = update_invoice(
            id=inv.id,
            req=InvoiceUpdate(status="paid"),
            user_and_org=(user, org),
            db=db,
        )

        assert out.status == "paid"
        assert float(out.balance) == 0
        assert out.stop_reminders is True
        sched = db.query(ReminderSchedule).filter(ReminderSchedule.invoice_id == inv.id).one()
        assert sched.status == "cancelled"
        assert db.query(Payout).filter(Payout.invoice_id == inv.id).one()
        audit = db.query(AuditLog).filter(AuditLog.action == "auto_stop_reminders").one()
        assert audit.actor_type == "user" and audit.actor_id == user.id

    def test_status_moved_off_paid_clears_the_stop_flags(self, db):
        user, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client, balance=0.0, status="paid", external_id="inv-reopen")
        inv.stop_reminders = True
        db.commit()

        out = update_invoice(
            id=inv.id,
            req=InvoiceUpdate(status="unpaid", balance=400.0),
            user_and_org=(user, org),
            db=db,
        )

        assert out.status == "unpaid"
        assert out.stop_reminders is False
        assert out.paid_at is None


# --------------------------------------------------------------------------
# Webhook events are triggers, never payment facts
# --------------------------------------------------------------------------
class TestWebhookTrust:
    def test_paid_payload_does_not_stop_reminders_without_a_provider_read(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client)
        monkeypatch.setattr(webhooks_module, "verify_intuit", lambda raw, sig: True)
        enqueued = []
        monkeypatch.setattr(
            "app.tasks.payment_detect.payment_detect_invoice_task.delay",
            lambda iid: enqueued.append(iid),
        )

        resp = TestClient(app).post(
            "/api/v1/webhooks/quickbooks",
            json={"status": "paid", "balance": 0, "invoice_id": "inv77"},
        )

        assert resp.status_code == 200
        assert enqueued == [inv.id]
        db.refresh(inv)
        assert inv.status == "chasing"
        assert db.query(Payout).count() == 0

    def test_entity_notifications_resolve_by_external_id(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        inv = _invoice(db, org, conn, client)
        monkeypatch.setattr(webhooks_module, "verify_intuit", lambda raw, sig: True)
        enqueued = []
        monkeypatch.setattr(
            "app.tasks.payment_detect.payment_detect_invoice_task.delay",
            lambda iid: enqueued.append(iid),
        )

        resp = TestClient(app).post(
            "/api/v1/webhooks/quickbooks",
            json={"eventNotifications": [{
                "dataChangeEvent": {"entities": [{"name": "Invoice", "id": "inv77"}]},
            }]},
        )

        assert resp.status_code == 200
        assert enqueued == [inv.id]

    def test_unrelated_provider_id_matches_nothing(self, db, monkeypatch):
        _, org, conn, client = _seed(db)
        _invoice(db, org, conn, client)
        monkeypatch.setattr(webhooks_module, "verify_intuit", lambda raw, sig: True)
        enqueued = []
        monkeypatch.setattr(
            "app.tasks.payment_detect.payment_detect_invoice_task.delay",
            lambda iid: enqueued.append(iid),
        )

        resp = TestClient(app).post(
            "/api/v1/webhooks/quickbooks",
            json={"invoice_id": "999999", "status": "paid"},
        )

        assert resp.status_code == 200
        assert resp.json()["processed"] == 0
        assert enqueued == []
