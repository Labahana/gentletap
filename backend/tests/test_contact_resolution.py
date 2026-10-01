"""Hybrid contact model — E.164 resolution, CSV carry-through, per-invoice override."""

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
from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.organization import Organization
from app.models.user import User
from app.services.reminder_contacts import (
    normalize_phone_e164,
    effective_reminder_phone,
)
from app.services.csv_import import parse_and_preview_csv, execute_csv_import


engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


class TestNormalizePhone:
    @pytest.mark.parametrize(
        "raw,expected",
        [
            ("+1 (555) 123-4567", "+15551234567"),
            ("+44 20 7946 0958", "+442079460958"),
            ("5551234567", "+15551234567"),          # bare 10-digit US -> +1
            ("15551234567", "+15551234567"),          # 11-digit NANP
            (None, None),
            ("", None),
            ("not-a-phone", None),
            ("12345", None),                          # too short
            ("+0123456789", None),                    # country code can't be 0
        ],
    )
    def test_cases(self, raw, expected):
        assert normalize_phone_e164(raw) == expected


class TestEffectiveReminderPhone:
    def test_override_wins_over_client_default(self):
        inv = Invoice(reminder_phone="+1 555 000 0001")
        cl = Client(phone="+1 555 000 0002")
        assert effective_reminder_phone(inv, cl) == "+15550000001"

    def test_falls_back_to_client_default(self):
        inv = Invoice(reminder_phone=None)
        cl = Client(phone="555 123 4567")
        assert effective_reminder_phone(inv, cl) == "+15551234567"

    def test_invalid_override_falls_back(self):
        inv = Invoice(reminder_phone="garbage")
        cl = Client(phone="+1 555 999 8888")
        assert effective_reminder_phone(inv, cl) == "+15559998888"

    def test_none_when_no_numbers(self):
        assert effective_reminder_phone(Invoice(reminder_phone=None), Client(phone=None)) is None


def _org(db):
    owner = User(email=f"o-{datetime.now(timezone.utc).timestamp()}@t.com", full_name="O", password_hash="x")
    db.add(owner)
    db.flush()
    org = Organization(name="Contact Org", owner_user_id=owner.id)
    db.add(org)
    db.commit()
    return org


class TestCsvCarryThrough:
    def test_preview_keeps_phone_and_link(self):
        csv_bytes = (
            b"client_name,client_email,client_phone,invoice_number,amount,due_date,payment_link\n"
            b"Acme,billing@acme.com,+1 555 111 2222,INV-1,100,2026-08-01,https://pay.acme/inv-1\n"
        )
        resp = parse_and_preview_csv(csv_bytes)
        row = resp.preview[0]
        assert row.client_phone == "+1 555 111 2222"
        assert row.payment_link == "https://pay.acme/inv-1"

    def test_execute_writes_resolved_contacts(self):
        session = TestingSessionLocal()
        try:
            org = _org(session)
            csv_bytes = (
                b"client_name,client_email,client_phone,invoice_number,amount,due_date,payment_link\n"
                b"Beta,ap@beta.com,555 333 4444,INV-9,250,2026-08-01,ftp://bad/not-a-link\n"
            )
            resp = parse_and_preview_csv(csv_bytes)
            count = execute_csv_import(session, org.id, resp.preview)
            assert count == 1

            client = session.query(Client).filter(Client.org_id == org.id, Client.name == "Beta").one()
            invoice = session.query(Invoice).filter(Invoice.org_id == org.id, Invoice.number == "INV-9").one()
            # bare 10-digit normalized into both the client default and the per-invoice override
            assert client.phone == "+15553334444"
            assert invoice.reminder_phone == "+15553334444"
            # non-http scheme is rejected, not stored
            assert invoice.payment_link is None
        finally:
            session.close()


class TestApiPhoneValidation:
    def test_clean_reminder_phone_accepts_and_clears(self):
        from app.api.invoices import _clean_reminder_phone

        assert _clean_reminder_phone(None) is None
        assert _clean_reminder_phone("") is None
        assert _clean_reminder_phone("+1 (555) 010 0100") == "+15550100100"

    def test_clean_reminder_phone_rejects_garbage(self):
        from app.api.invoices import _clean_reminder_phone

        with pytest.raises(HTTPException) as exc:
            _clean_reminder_phone("call me")
        assert exc.value.status_code == 422
