"""Integration fixes: provider sync attribution, Gmail threading, signature,
and WhatsApp credit refund."""

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("PADDLE_API_KEY", "test")
os.environ.setdefault("PADDLE_CLIENT_TOKEN", "test")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.api.connections import disconnect_connection
from app.models.client import Client
from app.models.connection import Connection
from app.models.invoice import Invoice
from app.models.message import Message
from app.models.organization import Organization
from app.models.user import User
from app.models.whatsapp_credit import WhatsAppCredit
from app.services import freshbooks, oauth_revoke, quickbooks
from app.services.crypto import encrypt_secret
from app.services.email import apply_signature
from app.services.plan_gating import consume_whatsapp_quota, refund_whatsapp_quota
from app.services.whatsapp import render_whatsapp_body
from app.tasks.send_email import build_thread

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


def _seed_org(db, plan="pro_plus"):
    stamp = datetime.now(timezone.utc).timestamp()
    user = User(email=f"u{stamp}@t.com", full_name="U", password_hash="x")
    db.add(user)
    db.flush()
    org = Organization(name="Org", owner_user_id=user.id, plan=plan)
    db.add(org)
    db.flush()
    return user, org


# --------------------------------------------------------------------------
# Pure helpers
# --------------------------------------------------------------------------
class TestApplySignature:
    def test_replaces_trailing_signoff(self):
        body = "Hi there,\n\nPlease pay invoice #1.\n\nBest regards,\nOld Name"
        out = apply_signature(body, "Warmly,\nJane Doe\nACME Co.")
        assert out.endswith("Warmly,\nJane Doe\nACME Co.")
        assert "Old Name" not in out
        assert "Please pay invoice #1." in out

    def test_appends_when_no_signoff(self):
        body = "Hi there"
        out = apply_signature(body, "Sig Block")
        assert out == "Hi there\n\nSig Block"

    def test_empty_signature_is_noop(self):
        body = "Body\n\nBest,\nName"
        assert apply_signature(body, None) == body
        assert apply_signature(body, "   ") == body


class TestRenderWhatsApp:
    def test_includes_link_when_present(self):
        body = render_whatsapp_body(0, name="Sam", number="INV-1", amount="100 USD", link="https://pay/x")
        assert "https://pay/x" in body

    def test_omits_fake_placeholder_when_no_link(self):
        body = render_whatsapp_body(0, name="Sam", number="INV-1", amount="100 USD", link=None)
        assert "your payment link" not in body
        assert "You can pay here" not in body


# --------------------------------------------------------------------------
# WhatsApp quota: consume returns a source, refund gives it back
# --------------------------------------------------------------------------
class TestWhatsappRefund:
    def test_refund_monthly(self, db):
        _, org = _seed_org(db, plan="pro_plus")
        org.whatsapp_quota = 450
        org.whatsapp_used_this_period = 0
        db.flush()

        src = consume_whatsapp_quota(db, org)
        assert src == "monthly"
        assert org.whatsapp_used_this_period == 1

        refund_whatsapp_quota(db, org, src)
        assert org.whatsapp_used_this_period == 0

    def test_refund_credit_pack(self, db):
        _, org = _seed_org(db, plan="team")
        org.whatsapp_quota = 0
        org.whatsapp_used_this_period = 0
        credit = WhatsAppCredit(org_id=org.id, credits_added=500, credits_used=0, status="active")
        db.add(credit)
        db.flush()

        src = consume_whatsapp_quota(db, org)
        assert src == credit.id
        assert credit.credits_used == 1

        refund_whatsapp_quota(db, org, src)
        assert credit.credits_used == 0


# --------------------------------------------------------------------------
# Gmail threading headers derived from Message ids
# --------------------------------------------------------------------------
class TestBuildThread:
    def test_first_message_has_only_message_id(self, db):
        _, org = _seed_org(db)
        c = Client(org_id=org.id, name="Acme", email="a@t.com")
        db.add(c)
        db.flush()
        inv = Invoice(org_id=org.id, client_id=c.id, number="I1", amount=10, balance=10, status="unpaid")
        db.add(inv)
        db.flush()
        m = Message(org_id=org.id, invoice_id=inv.id, client_id=c.id, channel="email",
                    subject="s", body="b", status="sent")
        db.add(m)
        db.flush()

        headers = build_thread(db, org_id=org.id, invoice_id=inv.id, client_id=c.id, current_msg_id=m.id)
        assert headers["message_id"] == f"<{m.id}@mail.gentletap.co>"
        assert "in_reply_to" not in headers
        assert "references" not in headers

    def test_second_message_references_first(self, db):
        _, org = _seed_org(db)
        c = Client(org_id=org.id, name="Acme", email="a@t.com")
        db.add(c)
        db.flush()
        inv = Invoice(org_id=org.id, client_id=c.id, number="I1", amount=10, balance=10, status="unpaid")
        db.add(inv)
        db.flush()
        m1 = Message(org_id=org.id, invoice_id=inv.id, client_id=c.id, channel="email",
                     subject="s", body="b", status="sent",
                     created_at=datetime.now(timezone.utc))
        db.add(m1)
        db.flush()
        m2 = Message(org_id=org.id, invoice_id=inv.id, client_id=c.id, channel="email",
                     subject="s", body="b", status="sent")
        db.add(m2)
        db.flush()

        headers = build_thread(db, org_id=org.id, invoice_id=inv.id, client_id=c.id, current_msg_id=m2.id)
        assert headers["in_reply_to"] == f"<{m1.id}@mail.gentletap.co>"
        assert f"<{m1.id}@mail.gentletap.co>" in headers["references"]


# --------------------------------------------------------------------------
# Provider sync attribution (no first-client fallback) — httpx stubbed
# --------------------------------------------------------------------------
class _Resp:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload


class _FakeClient:
    def __init__(self, routes):
        self._routes = routes

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def get(self, url, headers=None, params=None):
        for marker, resp in self._routes.items():
            if marker in url:
                return resp
        raise AssertionError(f"unexpected GET {url}")


class TestQuickBooksAttribution:
    def test_creates_stub_client_for_unmatched_customer(self, db, monkeypatch):
        _, org = _seed_org(db)
        decoy = Client(org_id=org.id, name="Decoy", email="decoy@t.com", external_client_id="decoy")
        db.add(decoy)
        db.flush()
        conn = Connection(org_id=org.id, provider="quickbooks", realm_id="r1",
                          token_encrypted=encrypt_secret("real_qbo"),
                          refresh_token_encrypted=encrypt_secret("real_qbo_refresh"), status="active")
        db.add(conn)
        db.flush()

        customers = _Resp({"QueryResponse": {"Customer": []}})
        invoices = _Resp({"QueryResponse": {"Invoice": [
            {"Id": "inv9", "DocNumber": "Q-9", "TotalAmt": 500, "Balance": 500,
             "CustomerRef": {"value": "custX", "name": "Real Payer"}},
        ]}})
        monkeypatch.setattr(quickbooks.httpx, "Client",
                            lambda *a, **k: _FakeClient({"from Customer": customers, "from Invoice": invoices}))

        quickbooks.sync_qbo_data(db, org.id, conn)

        inv = db.query(Invoice).filter(Invoice.external_id == "inv9").one()
        payer = db.query(Client).filter(Client.id == inv.client_id).one()
        assert payer.external_client_id == "custX"
        assert payer.name == "Real Payer"


class TestFreshBooksAttribution:
    def test_updates_and_attributes_by_client_id(self, db, monkeypatch):
        _, org = _seed_org(db)
        decoy = Client(org_id=org.id, name="Decoy", email="decoy@t.com", external_client_id="decoy")
        db.add(decoy)
        db.flush()
        conn = Connection(org_id=org.id, provider="freshbooks", account_id="acct1",
                          token_encrypted=encrypt_secret("real_fb"),
                          refresh_token_encrypted=encrypt_secret("real_fb_refresh"), status="active")
        db.add(conn)
        db.flush()

        clients = _Resp({"response": {"result": {"clients": [
            {"client_id": 77, "organization": "Nova LLC", "email": "ap@nova.com"},
        ], "total_items": 1}}})
        invoices = _Resp({"response": {"result": {"invoices": [
            {"invoiceid": 500, "invoice_number": "FB-500", "client_id": 77,
             "amount": {"amount": "1200.00"}, "outstanding": {"amount": "1200.00"}, "status": "unpaid"},
        ], "total_items": 1}}})
        monkeypatch.setattr(freshbooks.httpx, "Client",
                            lambda *a, **k: _FakeClient({"users/clients": clients, "invoices/invoices": invoices}))

        freshbooks.sync_freshbooks_data(db, org.id, conn)

        inv = db.query(Invoice).filter(Invoice.external_id == "500").one()
        payer = db.query(Client).filter(Client.id == inv.client_id).one()
        assert payer.external_client_id == "77"
        assert payer.name == "Nova LLC"


# --------------------------------------------------------------------------
# OAuth disconnect / purge: revoke provider token + destroy local secrets
# --------------------------------------------------------------------------
class TestConnectionRevocation:
    def _conn(self, db, org, provider="quickbooks"):
        conn = Connection(
            org_id=org.id,
            provider=provider,
            token_encrypted=encrypt_secret("real_access"),
            refresh_token_encrypted=encrypt_secret("real_refresh"),
            status="active",
        )
        db.add(conn)
        db.flush()
        return conn

    def test_destroy_connection_secrets_blanks_columns(self, db):
        _, org = _seed_org(db)
        conn = self._conn(db, org)
        oauth_revoke.destroy_connection_secrets(conn)
        assert conn.token_encrypted == ""
        assert conn.refresh_token_encrypted == ""
        assert conn.token_expires_at is None
        assert conn.status == "disconnected"

    def test_disconnect_endpoint_revokes_then_blanks(self, db, monkeypatch):
        user, org = _seed_org(db)
        conn = self._conn(db, org)
        calls = []

        def _fake_revoke(c):
            calls.append(c.id)
            return False

        monkeypatch.setattr("app.api.connections.revoke_connection_token", _fake_revoke)
        resp = disconnect_connection(conn.id, user_and_org=(user, org), db=db)
        assert resp["message"] == "Connection disconnected and access revoked"
        assert calls == [conn.id]
        db.refresh(conn)
        assert conn.token_encrypted == ""
        assert conn.refresh_token_encrypted == ""
        assert conn.status == "disconnected"

    def test_disconnect_missing_connection_404(self, db):
        user, org = _seed_org(db)
        with pytest.raises(Exception) as ei:
            disconnect_connection("nope", user_and_org=(user, org), db=db)
        assert getattr(ei.value, "status_code", None) == 404

    def test_revoke_skips_mock_token(self):
        conn = Connection(
            org_id="x", provider="quickbooks",
            token_encrypted="mock_access", refresh_token_encrypted="mock_refresh",
        )
        assert oauth_revoke.revoke_connection_token(conn) is False

    def test_revoke_quickbooks_posts_refresh_token(self, monkeypatch):
        monkeypatch.setattr(oauth_revoke.settings, "intuit_client_id", "cid", raising=False)
        monkeypatch.setattr(oauth_revoke.settings, "intuit_client_secret", "csecret", raising=False)
        captured = {}

        class _Resp:
            status_code = 200

        class _Client:
            def __init__(self, *a, **k):
                pass

            def __enter__(self):
                return self

            def __exit__(self, *a):
                return False

            def post(self, url, auth=None, json=None):
                captured["url"] = url
                captured["auth"] = auth
                captured["json"] = json
                return _Resp()

        monkeypatch.setattr(oauth_revoke.httpx, "Client", _Client)
        conn = Connection(
            org_id="x", provider="quickbooks",
            token_encrypted=encrypt_secret("acc"),
            refresh_token_encrypted=encrypt_secret("reftok"),
        )
        assert oauth_revoke.revoke_connection_token(conn) is True
        assert captured["url"] == oauth_revoke.QBO_REVOKE_URL
        assert captured["json"]["token"] == "reftok"
        assert captured["auth"] == ("cid", "csecret")

    def test_revoke_never_raises_on_network_error(self, monkeypatch):
        class _Boom:
            def __init__(self, *a, **k):
                raise RuntimeError("provider down")

        monkeypatch.setattr(oauth_revoke.httpx, "Client", _Boom)
        conn = Connection(
            org_id="x", provider="quickbooks",
            token_encrypted=encrypt_secret("acc"),
            refresh_token_encrypted=encrypt_secret("reftok"),
        )
        # Provider outage must not bubble up — the caller still destroys locally.
        assert oauth_revoke.revoke_connection_token(conn) is False
