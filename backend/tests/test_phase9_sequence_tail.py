"""Phase 9: sequence tail behavior — repeat-final-step loop + needs-your-call handoff."""

import os
import sys
from datetime import date, datetime, timedelta, timezone

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
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.notification import UserNotification
from app.models.organization import Organization
from app.models.reminder_job import ReminderJob
from app.models.sequence import Sequence
from app.models.user import User
from app.services import reminder_engine
from app.services.sequences import advance_after_send

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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


STEPS = [
    {"day_offset": 0, "tone": "friendly", "enabled": True},
    {"day_offset": 3, "tone": "professional", "enabled": True},
    {"day_offset": 21, "tone": "final", "enabled": True},
]
FINAL_INDEX = 2


def _seed(db, due_date=None, stop_after_days=30, repeat_days=0):
    stamp = datetime.now(timezone.utc).timestamp()
    user = User(email=f"u{stamp}@t.com", full_name="U", password_hash="x")
    db.add(user)
    db.flush()
    org = Organization(name="Org", owner_user_id=user.id)
    db.add(org)
    db.flush()
    client_row = Client(org_id=org.id, name="Acme", email="acme@t.com")
    db.add(client_row)
    db.flush()
    invoice = Invoice(
        org_id=org.id,
        client_id=client_row.id,
        number="INV-TAIL",
        amount=100,
        balance=100,
        currency="USD",
        status="unpaid",
        due_date=due_date,
    )
    db.add(invoice)
    db.flush()
    seq = Sequence(
        org_id=org.id,
        name="Tail",
        steps=[dict(s) for s in STEPS],
        stop_after_days=stop_after_days,
        repeat_final_step_every_days=repeat_days,
    )
    db.add(seq)
    db.flush()
    reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
    settings = reminder_engine.get_or_create_org_settings(db, org.id)
    settings.contact_window_enabled = False
    db.flush()
    return user, org, client_row, invoice, seq


def _final_job(db, invoice):
    return (
        db.query(ReminderJob)
        .filter(
            ReminderJob.invoice_id == invoice.id,
            ReminderJob.sequence_step == FINAL_INDEX,
        )
        .one_or_none()
    )


class TestNeedsYourCall:
    def test_repeat_off_records_exhaustion_and_notifies(self, db):
        user, org, _, invoice, seq = _seed(db, due_date=date.today() - timedelta(days=5))
        result = advance_after_send(db, invoice, seq, FINAL_INDEX)
        assert result is None
        audit = (
            db.query(AuditLog)
            .filter(AuditLog.action == "sequence_exhausted", AuditLog.entity_id == invoice.id)
            .one()
        )
        assert audit.org_id == org.id
        assert audit.actor_type == "system"
        notif = (
            db.query(UserNotification)
            .filter(UserNotification.org_id == org.id, UserNotification.type == "escalation")
            .one()
        )
        assert notif.user_id == user.id
        assert invoice.id in notif.link
        assert "INV-TAIL" in notif.title

    def test_exhaustion_is_deduped(self, db):
        _, _, _, invoice, seq = _seed(db, due_date=date.today())
        advance_after_send(db, invoice, seq, FINAL_INDEX)
        advance_after_send(db, invoice, seq, FINAL_INDEX)
        advance_after_send(db, invoice, seq, FINAL_INDEX)
        assert (
            db.query(AuditLog)
            .filter(AuditLog.action == "sequence_exhausted", AuditLog.entity_id == invoice.id)
            .count()
        ) == 1
        assert (
            db.query(UserNotification)
            .filter(UserNotification.org_id == invoice.org_id, UserNotification.type == "escalation")
            .count()
        ) == 1

    def test_past_stop_after_days_exhausts_despite_repeat(self, db):
        _, _, _, invoice, seq = _seed(
            db, due_date=date.today() - timedelta(days=40), stop_after_days=30, repeat_days=7
        )
        assert advance_after_send(db, invoice, seq, FINAL_INDEX) is None
        assert _final_job(db, invoice) is None or _final_job(db, invoice).status != "pending"
        assert (
            db.query(AuditLog)
            .filter(AuditLog.action == "sequence_exhausted", AuditLog.entity_id == invoice.id)
            .count()
        ) == 1

    def test_no_cap_repeats_forever(self, db):
        # Column default maps None -> 30, so "effectively no cap" = huge window.
        _, _, _, invoice, seq = _seed(
            db, due_date=date.today() - timedelta(days=200), stop_after_days=10000, repeat_days=10
        )
        job = advance_after_send(db, invoice, seq, FINAL_INDEX)
        assert job is not None
        assert job.status == "pending"
        assert (
            db.query(AuditLog)
            .filter(AuditLog.action == "sequence_exhausted")
            .count()
        ) == 0


class TestRepeatFinalStep:
    def test_repeat_revives_same_step_job(self, db):
        _, _, _, invoice, seq = _seed(db, due_date=date.today(), repeat_days=7)
        job = advance_after_send(db, invoice, seq, FINAL_INDEX)
        assert job is not None
        assert job.sequence_step == FINAL_INDEX
        assert job.status == "pending"
        now = datetime.now(timezone.utc)
        assert now + timedelta(days=7) - timedelta(minutes=1) <= job.scheduled_for <= now + timedelta(
            days=7, minutes=45
        )

    def test_repeat_recreates_sent_schedule_row_on_materialize(self, db):
        _, _, _, invoice, seq = _seed(db, due_date=date.today(), repeat_days=7)
        # Mark the final schedule row as sent, as the pipeline would after a send.
        from app.models.reminder_schedule import ReminderSchedule
        from app.services.sequences import materialize_step

        sched = (
            db.query(ReminderSchedule)
            .filter(
                ReminderSchedule.invoice_id == invoice.id,
                ReminderSchedule.step_index == FINAL_INDEX,
            )
            .one()
        )
        sched.status = "sent"
        db.flush()
        fresh = materialize_step(db, invoice, seq, FINAL_INDEX)
        assert fresh.id != sched.id
        assert fresh.status == "pending"

    def test_repeat_loops_repeatedly(self, db):
        _, _, _, invoice, seq = _seed(db, due_date=date.today(), repeat_days=7)
        for _ in range(3):
            job = advance_after_send(db, invoice, seq, FINAL_INDEX)
            assert job is not None and job.status == "pending"
            job.status = "sent"
            db.flush()
        assert (
            db.query(AuditLog)
            .filter(AuditLog.action == "sequence_exhausted")
            .count()
        ) == 0

    def test_payment_cancel_stops_repeat_job(self, db):
        _, _, _, invoice, seq = _seed(db, due_date=date.today(), repeat_days=7)
        job = advance_after_send(db, invoice, seq, FINAL_INDEX)
        assert job is not None
        reminder_engine.cancel_pending_reminders(db, invoice.id)
        db.commit()  # cancel mutates jobs without its own flush; callers commit
        db.refresh(job)
        assert job.status == "cancelled"

    def test_middle_step_never_exhausts(self, db):
        _, _, _, invoice, seq = _seed(db, due_date=date.today(), repeat_days=0)
        job = advance_after_send(db, invoice, seq, 0)
        assert job is not None and job.sequence_step == 1
        assert (
            db.query(AuditLog).filter(AuditLog.action == "sequence_exhausted").count()
        ) == 0
