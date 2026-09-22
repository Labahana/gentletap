"""Phase 3: ReminderJob lazy scheduling — dispatch, materialization, spacing, sync."""

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
from sqlalchemy import create_engine, update as sql_update
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.message import Message
from app.models.organization import Organization
from app.models.reminder_job import ReminderJob
from app.models.reminder_schedule import ReminderSchedule
from app.models.sequence import Sequence
from app.models.user import User
from app.services import reminder_engine
from app.services.sequences import (
    advance_after_send,
    claim_due_jobs,
    execute_job,
    materialize_step,
    requeue_stuck_jobs,
)

# In-memory (StaticPool) rather than a file DB: file-based SQLite DBs from
# multiple test modules stay locked via their StaticPool connections and
# contaminate each other in full-suite runs.
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
    # Install this file's DB override only around THIS file's tests: assigning
    # it at module import time clobbers the override of every other test file
    # (the assignment is global on the app), which is what makes unrelated
    # files see "no such table" in full-suite runs.
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
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


client = TestClient(app)


def _auth_headers():
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    email = f"phase6jobs_{ts}@test.com"
    signup = client.post(
        "/api/v1/auth/signup",
        json={"email": email, "password": "testpass123", "full_name": "Phase6 Jobs"},
    )
    assert signup.status_code == 200, signup.text
    token = signup.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _seed_invoice(db, cadence_override=None):
    stamp = datetime.now(timezone.utc).timestamp()
    user = User(email=f"u{stamp}@t.com", full_name="U", password_hash="x")
    db.add(user)
    db.flush()
    org = Organization(name="Org", owner_user_id=user.id)
    db.add(org)
    db.flush()
    client_row = Client(org_id=org.id, name="Acme", email="acme@t.com")
    if cadence_override is not None:
        client_row.cadence_override = cadence_override
    db.add(client_row)
    db.flush()
    invoice = Invoice(
        org_id=org.id,
        client_id=client_row.id,
        number="INV-1",
        amount=100,
        balance=100,
        currency="USD",
        status="unpaid",
    )
    db.add(invoice)
    db.flush()
    return user, org, client_row, invoice


def _seed_sequence(db, org_id, steps):
    seq = Sequence(org_id=org_id, name="Default", steps=steps)
    db.add(seq)
    db.flush()
    return seq


STEPS = [
    {"day_offset": 0, "tone": "friendly", "enabled": True},
    {"day_offset": 3, "tone": "firm", "enabled": True},
    {"day_offset": 7, "tone": "urgent", "enabled": True},
    {"day_offset": 14, "tone": "urgent", "enabled": True},
    {"day_offset": 21, "tone": "final", "enabled": True},
]


class TestAssignmentCreatesJob:
    def test_build_schedule_creates_step0_job(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        assert job.sequence_step == 0
        assert job.status == "pending"
        assert job.sequence_id == seq.id
        rows = db.query(ReminderSchedule).filter(ReminderSchedule.invoice_id == invoice.id).all()
        assert len(rows) == 5

    def test_cancel_pending_reminders_cancels_jobs(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        reminder_engine.cancel_pending_reminders(db, invoice.id)
        assert db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one().status == "cancelled"

    def test_pause_and_resume_sync_job(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        reminder_engine.pause_pending_reminders(db, invoice.id)
        assert db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one().status == "cancelled"
        reminder_engine.resume_pending_reminders(db, invoice, None)
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        assert job.status == "pending"


class TestMaterializeStep:
    def test_idempotent_returns_existing_pending_row(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        row1 = materialize_step(db, invoice, seq, 0)
        row2 = materialize_step(db, invoice, seq, 0)
        assert row1.id == row2.id
        count = (
            db.query(ReminderSchedule)
            .filter(ReminderSchedule.invoice_id == invoice.id, ReminderSchedule.step_index == 0)
            .count()
        )
        assert count == 1

    def test_recreates_row_when_missing(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        db.query(ReminderSchedule).filter(
            ReminderSchedule.invoice_id == invoice.id, ReminderSchedule.step_index == 2
        ).delete()
        db.flush()
        row = materialize_step(db, invoice, seq, 2)
        assert row is not None
        assert row.step_index == 2
        assert row.tone == "urgent"

    def test_cadence_override_creates_two_rows(self, db):
        _, org, _, invoice = _seed_invoice(db, cadence_override=[0, 1])
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        rows = (
            db.query(ReminderSchedule)
            .filter(ReminderSchedule.invoice_id == invoice.id)
            .order_by(ReminderSchedule.step_index)
            .all()
        )
        assert len(rows) == 2
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        assert job.sequence_step == 0


class TestAdvanceAfterSend:
    def test_natural_gap_spacing(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        before = datetime.now(timezone.utc)
        job = advance_after_send(db, invoice, seq, 0)
        after = datetime.now(timezone.utc)
        assert job is not None and job.sequence_step == 1
        assert before + timedelta(days=3) - timedelta(seconds=5) <= job.scheduled_for
        assert job.scheduled_for <= after + timedelta(days=3, minutes=30)
        assert job.status == "pending"

    def test_gap_floor_with_override(self, db):
        _, org, _, invoice = _seed_invoice(db, cadence_override=[0, 1])
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        job = advance_after_send(db, invoice, seq, 0)
        assert job is not None
        assert job.scheduled_for >= datetime.now(timezone.utc) + timedelta(days=2) - timedelta(seconds=5)

    def test_last_step_advances_none(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        assert advance_after_send(db, invoice, seq, 4) is None

    def test_disabled_steps_keep_index_alignment(self, db):
        steps = [dict(s) for s in STEPS]
        steps[1]["enabled"] = False
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, steps)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        job = advance_after_send(db, invoice, seq, 0)
        assert job is not None and job.sequence_step == 2


class TestClaimAndRequeue:
    def test_claim_due_jobs(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        ids = claim_due_jobs(db, datetime.now(timezone.utc))
        assert len(ids) == 1
        job = db.query(ReminderJob).filter(ReminderJob.id == ids[0]).one()
        assert job.status == "processing"
        assert claim_due_jobs(db, datetime.now(timezone.utc)) == []

    def test_future_job_not_claimed(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        db.execute(
            sql_update(ReminderJob)
            .where(ReminderJob.invoice_id == invoice.id)
            .values(scheduled_for=datetime.now(timezone.utc) + timedelta(days=1))
        )
        db.commit()
        assert claim_due_jobs(db, datetime.now(timezone.utc)) == []

    def test_requeue_stuck_jobs_fails_at_cap(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        db.execute(
            sql_update(ReminderJob)
            .where(ReminderJob.id == job.id)
            .values(status="processing", attempts=4, updated_at=datetime.now(timezone.utc) - timedelta(minutes=16))
        )
        db.commit()
        count = requeue_stuck_jobs(db, datetime.now(timezone.utc))
        assert count == 1
        db.refresh(job)
        assert job.status == "failed"
        assert job.attempts == 5
        assert job.last_error == "max_attempts_stuck"

    def test_requeue_stuck_jobs_below_cap_requeues(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        db.execute(
            sql_update(ReminderJob)
            .where(ReminderJob.id == job.id)
            .values(status="processing", attempts=1, updated_at=datetime.now(timezone.utc) - timedelta(minutes=16))
        )
        db.commit()
        assert requeue_stuck_jobs(db, datetime.now(timezone.utc)) == 1
        db.refresh(job)
        assert job.status == "pending"
        assert job.attempts == 2


class TestExecuteJobEndToEnd:
    def _prepare(self, db, monkeypatch):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        os_row = reminder_engine.get_or_create_org_settings(db, org.id)
        os_row.contact_window_enabled = False
        db.flush()

        # Neutralize the intelligence gate: no context -> gate is a no-op.
        monkeypatch.setattr(
            "app.intelligence.context_builder.build_reminder_context",
            lambda db_, inv, org_, sequence_step=0: None,
        )
        # Avoid AI/template drafting network paths.
        monkeypatch.setattr(
            "app.tasks.process_reminders.draft_reminder_content",
            lambda db_, schedule: {
                "subject": "Please pay",
                "body": "Hi, please pay.",
                "provider": "template",
                "template_id": None,
            },
        )

        def _fake_send(db_, org_id, invoice_id, client_id, subject, body, template_id=None, ai_provider_used=None):
            msg = Message(
                org_id=org_id,
                invoice_id=invoice_id,
                client_id=client_id,
                subject=subject,
                body=body,
                channel="email",
                status="sent",
                sent_at=datetime.now(timezone.utc),
            )
            db_.add(msg)
            db_.flush()
            return msg

        monkeypatch.setattr("app.tasks.process_reminders.create_and_send_message", _fake_send)
        return invoice, seq

    def test_execute_job_sends_and_advances(self, db, monkeypatch):
        invoice, seq = self._prepare(db, monkeypatch)
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        result = execute_job(db, job)
        assert result["status"] == "sent"
        db.refresh(job)
        assert job.status == "sent"
        row0 = (
            db.query(ReminderSchedule)
            .filter(ReminderSchedule.invoice_id == invoice.id, ReminderSchedule.step_index == 0)
            .one()
        )
        assert row0.status == "sent"
        next_job = (
            db.query(ReminderJob)
            .filter(ReminderJob.invoice_id == invoice.id, ReminderJob.sequence_step == 1)
            .one_or_none()
        )
        assert next_job is not None and next_job.status == "pending"

    def test_execute_job_missing_invoice_fails(self, db):
        _, org, _, invoice = _seed_invoice(db)
        seq = _seed_sequence(db, org.id, STEPS)
        reminder_engine.assign_sequence_and_schedule(db, invoice, seq)
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        db.query(Invoice).filter(Invoice.id == invoice.id).delete()
        db.flush()
        result = execute_job(db, job)
        assert result["status"] == "failed"
        assert result["reason"] == "invoice_missing"


class TestApiJobSync:
    def test_patch_schedule_syncs_job_time(self):
        headers = _auth_headers()
        resp = client.post("/api/v1/clients", json={"name": "Acme", "email": "acme@t.com"}, headers=headers)
        assert resp.status_code == 200, resp.text
        client_id = resp.json()["id"]
        resp = client.post(
            "/api/v1/invoices",
            json={"number": "INV-1", "client_id": client_id, "amount": 100, "currency": "USD"},
            headers=headers,
        )
        assert resp.status_code == 200, resp.text
        invoice_id = resp.json()["id"]

        session = TestingSessionLocal()
        try:
            invoice = session.query(Invoice).filter(Invoice.id == invoice_id).one()
            seq = _seed_sequence(session, invoice.org_id, STEPS)
            reminder_engine.assign_sequence_and_schedule(session, invoice, seq)
            session.commit()
            job = session.query(ReminderJob).filter(ReminderJob.invoice_id == invoice_id).one()
            row = (
                session.query(ReminderSchedule)
                .filter(ReminderSchedule.invoice_id == invoice_id, ReminderSchedule.step_index == 0)
                .one()
            )
            new_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
            resp = client.patch(
                f"/api/v1/invoices/{invoice_id}/schedule/{row.id}",
                json={"scheduled_at": new_time},
                headers=headers,
            )
            assert resp.status_code == 200, resp.text
            session.refresh(job)
            job_time = job.scheduled_for
            if job_time.tzinfo is None:
                job_time = job_time.replace(tzinfo=timezone.utc)
            expected = datetime.fromisoformat(new_time)
            assert abs((job_time - expected).total_seconds()) < 2
        finally:
            session.close()
