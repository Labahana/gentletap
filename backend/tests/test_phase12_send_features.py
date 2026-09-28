"""Production-grade send features ported from the reference project:
  #48 invoice payment_link (model/API cleaning)
  #49 WhatsApp Meta Content Templates (ContentSid + variables, sandbox fallback)
  #50 sender identity (display name, Reply-To, List-Unsubscribe) + HTML emails
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("PADDLE_API_KEY", "test")
os.environ.setdefault("PADDLE_CLIENT_TOKEN", "test")

import json
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.invoice import Invoice
from app.models.organization import Organization
from app.models.user import User
from app.api.invoices import _clean_payment_link
from app.services import whatsapp
from app.services.whatsapp import (
    build_variables,
    content_sid_for,
    select_template_key,
    send_whatsapp,
)
from app.services.email import _from_with_display, _org_sender_identity, send_email_dispatch
from app.services.html_email import text_to_html

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


def _seed_org(db, name="Acme Studio", owner_email="owner@acme.com"):
    stamp = datetime.now(timezone.utc).timestamp()
    user = User(email=owner_email or f"u{stamp}@t.com", full_name="Owner", password_hash="x")
    db.add(user)
    db.flush()
    org = Organization(name=name, owner_user_id=user.id, plan="pro_plus")
    db.add(org)
    db.flush()
    return user, org


# --------------------------------------------------------------------------
# #48 — payment_link cleaning + persistence
# --------------------------------------------------------------------------
class TestPaymentLinkCleaning:
    def test_none_and_blank_become_none(self):
        assert _clean_payment_link(None) is None
        assert _clean_payment_link("") is None
        assert _clean_payment_link("   ") is None

    def test_valid_url_is_stripped(self):
        assert _clean_payment_link("  https://pay.acme/inv-9  ") == "https://pay.acme/inv-9"

    def test_http_allowed(self):
        assert _clean_payment_link("http://x.co/y") == "http://x.co/y"

    def test_rejects_non_url(self):
        with pytest.raises(HTTPException) as exc:
            _clean_payment_link("pay.acme/inv-9")
        assert exc.value.status_code == 422

    def test_rejects_javascript_scheme(self):
        with pytest.raises(HTTPException):
            _clean_payment_link("javascript:alert(1)")

    def test_truncates_to_2048(self):
        long = "https://x.co/" + "a" * 3000
        assert len(_clean_payment_link(long)) == 2048

    def test_model_persists_payment_link(self, db):
        from app.models.client import Client
        _, org = _seed_org(db)
        c = Client(org_id=org.id, name="Acme", email="a@t.com")
        db.add(c)
        db.flush()
        inv = Invoice(org_id=org.id, client_id=c.id, number="I1", amount=10, balance=10, status="unpaid",
                      payment_link="https://pay.acme/inv-9")
        db.add(inv)
        db.commit()
        assert db.query(Invoice).filter(Invoice.id == inv.id).one().payment_link == "https://pay.acme/inv-9"


# --------------------------------------------------------------------------
# #49 — WhatsApp Meta Content Templates
# --------------------------------------------------------------------------
class TestWhatsappTemplateSelection:
    def test_step_buckets(self):
        assert select_template_key(0) == "gentle"
        assert select_template_key(1) == "follow_up"
        assert select_template_key(2) == "final"

    def test_tone_overrides_step(self):
        assert select_template_key(0, "firm") == "final"
        assert select_template_key(0, "urgent") == "final"
        assert select_template_key(0, "professional") == "follow_up"

    def test_content_sid_resolution(self, monkeypatch):
        monkeypatch.setattr(whatsapp.settings, "twilio_whatsapp_content_sid_final", "  HX123  ", raising=False)
        monkeypatch.setattr(whatsapp.settings, "twilio_whatsapp_content_sid_gentle", "", raising=False)
        assert content_sid_for("final") == "HX123"
        assert content_sid_for("gentle") == ""
        assert content_sid_for("unknown_key") == ""

    def test_build_variables_shape(self):
        v = build_variables(name="Sam", sender_name="Acme", number="INV-1", amount="$100 USD", days_overdue=5)
        assert set(v.keys()) == {"1", "2", "3", "4", "5"}
        assert v["1"] == "Sam"
        assert v["5"] == "5 days past due"

    def test_build_variables_due_soon_when_not_overdue(self):
        v = build_variables(name="Sam", sender_name="Acme", number="INV-1", amount="$100", days_overdue=0)
        assert v["5"] == "due soon"

    def test_build_variables_truncates(self):
        v = build_variables(name="N" * 100, sender_name="S" * 100, number="I" * 100,
                            amount="A" * 100, days_overdue=1)
        assert len(v["1"]) <= 40
        assert len(v["2"]) <= 40
        assert len(v["3"]) <= 30
        assert len(v["4"]) <= 30


class _WAResp:
    def __init__(self, status_code=201, payload=None):
        self.status_code = status_code
        self._payload = payload or {"sid": "SM1", "status": "queued"}
        self.text = "ok"

    def json(self):
        return self._payload


class _WAClient:
    def __init__(self, captured, resp):
        self._captured = captured
        self._resp = resp

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def post(self, url, data=None, auth=None):
        self._captured.update(data or {})
        return self._resp


def _stub_twilio(monkeypatch, creds=True):
    monkeypatch.setattr(whatsapp.settings, "twilio_account_sid", "AC123" if creds else "", raising=False)
    monkeypatch.setattr(whatsapp.settings, "twilio_auth_token", "tok" if creds else "", raising=False)
    monkeypatch.setattr(whatsapp.settings, "twilio_whatsapp_from", "whatsapp:+1500", raising=False)


class TestWhatsappSendModes:
    def test_content_template_uses_contentsid(self, monkeypatch):
        _stub_twilio(monkeypatch)
        captured = {}
        monkeypatch.setattr(whatsapp.httpx, "Client", lambda *a, **k: _WAClient(captured, _WAResp()))
        result = send_whatsapp(
            "+15551234567",
            "ignored body",
            content_sid="HX999",
            variables={"1": "Sam", "2": "Acme", "3": "INV-1", "4": "$100", "5": "due soon"},
        )
        assert captured["ContentSid"] == "HX999"
        assert json.loads(captured["ContentVariables"])["1"] == "Sam"
        assert "Body" not in captured
        assert result["status"] == "queued"

    def test_plain_body_fallback_without_sid(self, monkeypatch):
        _stub_twilio(monkeypatch)
        captured = {}
        monkeypatch.setattr(whatsapp.httpx, "Client", lambda *a, **k: _WAClient(captured, _WAResp()))
        send_whatsapp("+15551234567", "Hi Sam, invoice INV-1", content_sid=None, variables=None)
        assert captured["Body"] == "Hi Sam, invoice INV-1"
        assert "ContentSid" not in captured

    def test_no_credentials_returns_mock(self, monkeypatch):
        _stub_twilio(monkeypatch, creds=False)
        result = send_whatsapp("+15551234567", "body", content_sid="HX1", variables={"1": "x"})
        assert result["mock"] is True
        assert result["status"] == "sent"


# --------------------------------------------------------------------------
# #50 — sender identity + HTML email
# --------------------------------------------------------------------------
class TestFromWithDisplay:
    def test_swaps_display_keeps_address(self):
        out = _from_with_display("GentleTap <mail@acme.gentletap.co>", "Acme Studio")
        assert out == '"Acme Studio" <mail@acme.gentletap.co>'

    def test_no_display_is_noop(self):
        assert _from_with_display("nope@x.co", None) == "nope@x.co"

    def test_blank_display_falls_back_to_brand(self):
        assert _from_with_display("nope@x.co", "   ") == '"GentleTap" <nope@x.co>'

    def test_strips_quotes_from_display(self):
        out = _from_with_display("a@x.co", 'We"ird')
        assert out == '"Weird" <a@x.co>'


class TestOrgSenderIdentity:
    def test_returns_name_and_owner_email(self, db):
        _, org = _seed_org(db, name="Bluepeak", owner_email="finance@bluepeak.io")
        display, reply_to = _org_sender_identity(db, org.id)
        assert display == "Bluepeak"
        assert reply_to == "finance@bluepeak.io"

    def test_none_db_returns_none(self):
        assert _org_sender_identity(None, "x") == (None, None)


class TestTextToHtml:
    def test_escapes_and_linkifies(self):
        out = text_to_html('Hi <b>\nsee https://pay.acme/x')
        assert "&lt;b&gt;" in out
        assert '<a href="https://pay.acme/x">https://pay.acme/x</a>' in out
        assert "<br/>" in out

    def test_empty_is_safe(self):
        assert "div" in text_to_html("")


class TestDispatchWiresIdentity:
    def test_resend_gets_display_replyto_and_unsubscribe(self, db, monkeypatch):
        _, org = _seed_org(db, name="Acme Studio", owner_email="owner@acme.com")
        captured = {}

        def fake_send(to_email, subject, body, headers=None, from_email=None, reply_to=None):
            captured.update(
                {"to": to_email, "headers": headers, "from": from_email, "reply_to": reply_to}
            )
            return {"id": "x", "provider": "resend"}

        monkeypatch.setattr("app.services.email.send_email_via_resend", fake_send)
        send_email_dispatch(
            org_id=org.id,
            to_email="client@x.com",
            subject="Reminder",
            body="Hello",
            send_via="resend",
            db=db,
            thread={"message_id": "<m1@mail.gentletap.co>"},
        )
        assert captured["from"].startswith('"Acme Studio"')
        assert captured["reply_to"] == "owner@acme.com"
        assert "List-Unsubscribe" in captured["headers"]
        assert captured["headers"]["List-Unsubscribe"].startswith("<http")
        assert captured["headers"]["Message-ID"] == "<m1@mail.gentletap.co>"
