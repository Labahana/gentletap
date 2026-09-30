"""Autopilot reconciler: manual/CSV invoices (no connection) must get chased too."""

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

from app.database import Base
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.org_settings import OrgSettings
from app.models.organization import Organization
from app.models.reminder_schedule import ReminderSchedule
from app.models.sequence import Sequence, SequenceAssignment
from app.models.user import User
from app.services.reminder_engine import (
    autopilot_assign_if_enabled,
    autopilot_reconcile_all,
)

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

STEPS = [{"day_offset": 0, "tone": "friendly", "enabled": True}]


@pytest.fixture(autouse=True)
def setup_database():
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


def _seed(db, *, autopilot=True, connection_id=None, stop_reminders=False, status="unpaid"):
    owner = User(email=f"o-{datetime.now(timezone.utc).timestamp()}@t.com", full_name="O", password_hash="x")
    db.add(owner)
    db.flush()
    org = Organization(name="Reconcile Org", owner_user_id=owner.id)
    db.add(org)
    db.flush()
    db.add(OrgSettings(org_id=org.id, operation_mode="autopilot" if autopilot else "template"))
    cl = Client(org_id=org.id, name="Avery", email="avery@example.com")
    db.add(cl)
    db.flush()
    inv = Invoice(
        org_id=org.id,
        client_id=cl.id,
        number="INV-MANUAL",
        amount=500,
        balance=500,
        currency="USD",
        status=status,
        connection_id=connection_id,
        stop_reminders=stop_reminders,
        imported_from="manual",
    )
    db.add(inv)
    db.flush()
    seq = Sequence(
        org_id=org.id,
        name="Autopilot Default Sequence",
        steps=STEPS,
        is_default=True,
        auto_assign=True,
        status="active",
    )
    db.add(seq)
    db.commit()
    return org, inv, seq


def test_reconcile_assigns_manual_invoice_without_connection(db):
    org, inv, _ = _seed(db, connection_id=None)
    result = autopilot_reconcile_all(db)

    assert result["assigned"] == 1
    assignment = db.query(SequenceAssignment).filter(SequenceAssignment.invoice_id == inv.id).first()
    assert assignment is not None and assignment.status == "active"
    assert db.query(ReminderSchedule).filter(ReminderSchedule.invoice_id == inv.id).count() >= 1
    db.refresh(inv)
    assert inv.status == "chasing"


def test_reconcile_is_idempotent(db):
    _seed(db)
    autopilot_reconcile_all(db)
    second = autopilot_reconcile_all(db)
    assert second["assigned"] == 0
    assert db.query(SequenceAssignment).count() == 1


def test_reconcile_skips_non_autopilot_and_stopped(db):
    _seed(db, autopilot=False)
    assert autopilot_reconcile_all(db)["assigned"] == 0

    _seed(db, stop_reminders=True)
    assert autopilot_reconcile_all(db)["assigned"] == 0


def test_assign_on_create_requires_autopilot(db):
    org, inv, _ = _seed(db, autopilot=False)
    assert autopilot_assign_if_enabled(db, inv) is False

    settings = db.query(OrgSettings).filter(OrgSettings.org_id == org.id).first()
    settings.operation_mode = "autopilot"
    db.commit()
    assert autopilot_assign_if_enabled(db, inv) is True
    assert db.query(SequenceAssignment).filter(SequenceAssignment.invoice_id == inv.id).count() == 1
