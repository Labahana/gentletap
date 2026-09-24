"""Phase 4: approval gates, approval queue, and anchored AI drafting."""

import os
import sys
from contextlib import contextmanager
from datetime import datetime, timezone

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
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.message import Message
from app.models.org_settings import OrgSettings
from app.models.organization import Organization
from app.models.reminder_job import ReminderJob
from app.models.reminder_schedule import ReminderSchedule
from app.models.sequence import Sequence
from app.models.user import User
from app.services.approval import requires_approval
from app.services import reminder_engine
from app.services.sequences import execute_job
from app.tasks.draft_message import draft_reminder_content

SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
client = TestClient(app)

STEPS = [
    {"day_offset": 0, "tone": "friendly", "enabled": True},
    {"day_offset": 3, "tone": "firm", "enabled": True},
]


@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(autouse=True)
def bypass_redis_lock(monkeypatch):
    @contextmanager
    def unlocked(*args, **kwargs):
        yield True

    monkeypatch.setattr("app.tasks.process_reminders.redis_lock", unlocked)


def override_get_db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


def _seed_invoice(db, org=None, owner=None, amount=100):
    stamp = datetime.now(timezone.utc).timestamp()
    if owner is None:
        owner = User(email=f"phase7-{stamp}@test.com", full_name="Owner", password_hash="x")
        db.add(owner)
        db.flush()
    if org is None:
        org = Organization(name="Approval Org", owner_user_id=owner.id)
        db.add(org)
        db.flush()
    client_row = Client(org_id=org.id, name="Avery Client", email="avery@example.com")
    db.add(client_row)
    db.flush()
    invoice = Invoice(
        org_id=org.id,
        client_id=client_row.id,
        number="INV-APPROVAL",
        amount=amount,
        balance=amount,
        currency="USD",
        status="unpaid",
    )
    db.add(invoice)
    db.flush()
    return owner, org, client_row, invoice


def _seed_sequence(db, org_id):
    sequence = Sequence(org_id=org_id, name="Approval sequence", steps=STEPS)
    db.add(sequence)
    db.flush()
    return sequence


def _prepare_job(db, monkeypatch, mode="first_batch", amount=100):
    _, org, _, invoice = _seed_invoice(db, amount=amount)
    sequence = _seed_sequence(db, org.id)
    reminder_engine.assign_sequence_and_schedule(db, invoice, sequence)
    settings = reminder_engine.get_or_create_org_settings(db, org.id)
    settings.contact_window_enabled = False
    settings.approval_mode = mode
    if mode == "amount_threshold":
        settings.approval_threshold_amount = amount
    db.flush()

    monkeypatch.setattr(
        "app.intelligence.context_builder.build_reminder_context",
        lambda db_, inv, org_, sequence_step=0: None,
    )
    drafts = {"count": 0}

    def _draft(db_, schedule):
        drafts["count"] += 1
        return {
            "subject": "Please pay INV-APPROVAL",
            "body": "Hi Avery, please pay your invoice.",
            "provider": "template",
            "template_id": None,
        }

    monkeypatch.setattr("app.tasks.process_reminders.draft_reminder_content", _draft)

    def _send(db_, org_id, invoice_id, client_id, subject, body, template_id=None, ai_provider_used=None):
        message = Message(
            org_id=org_id,
            invoice_id=invoice_id,
            client_id=client_id,
            subject=subject,
            body=body,
            channel="email",
            status="sent",
            sent_at=datetime.now(timezone.utc),
        )
        db_.add(message)
        db_.flush()
        return message

    monkeypatch.setattr("app.tasks.process_reminders.create_and_send_message", _send)
    job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
    return org, invoice, sequence, job, drafts


def _auth_headers():
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    response = client.post(
        "/api/v1/auth/signup",
        json={
            "email": f"phase7-{stamp}@test.com",
            "password": "testpass123",
            "full_name": "Phase 7",
        },
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


class TestRequiresApproval:
    def test_off_never_requires_approval(self, db):
        _, org, _, invoice = _seed_invoice(db)
        settings = reminder_engine.get_or_create_org_settings(db, org.id)
        settings.approval_mode = "off"
        assert requires_approval(db, settings, invoice) == (False, None)

    def test_amount_threshold_includes_boundary(self, db):
        _, org, _, invoice = _seed_invoice(db, amount=100)
        settings = reminder_engine.get_or_create_org_settings(db, org.id)
        settings.approval_mode = "amount_threshold"
        settings.approval_threshold_amount = 100
        assert requires_approval(db, settings, invoice) == (True, "amount_threshold")
        invoice.amount = 99.99
        assert requires_approval(db, settings, invoice) == (False, None)

    def test_first_batch_stops_requiring_approval_after_send(self, db):
        _, org, client_row, invoice = _seed_invoice(db)
        settings = reminder_engine.get_or_create_org_settings(db, org.id)
        settings.approval_mode = "first_batch"
        assert requires_approval(db, settings, invoice) == (True, "first_batch")
        db.add(
            Message(
                org_id=org.id,
                invoice_id=invoice.id,
                client_id=client_row.id,
                subject="Sent",
                body="Already sent",
                channel="email",
                status="sent",
            )
        )
        db.flush()
        assert requires_approval(db, settings, invoice) == (False, None)


class TestApprovalPipeline:
    def test_job_parks_draft_and_cancels_dispatch_job(self, db, monkeypatch):
        org, invoice, _, job, drafts = _prepare_job(db, monkeypatch)
        result = execute_job(db, job)
        assert result == {"status": "awaiting_approval", "reason": "first_batch"}
        row = db.query(
            ReminderSchedule
        ).filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.step_index == 0,
        ).one()
        assert row.status == "awaiting_approval"
        assert row.draft_subject == "Please pay INV-APPROVAL"
        assert drafts["count"] == 1
        assert job.status == "cancelled"
        db.flush()
        audit = db.query(AuditLog).filter(AuditLog.org_id == org.id).one()
        assert audit.action == "reminder_awaiting_approval"
        assert audit.details["reason"] == "first_batch"

    def test_approve_edits_draft_revives_job_and_sends_once(self, db, monkeypatch):
        headers = _auth_headers()
        org = db.query(Organization).one()
        owner = db.query(User).filter(User.id == org.owner_user_id).one()
        _, _, _, invoice = _seed_invoice(db, org=org, owner=owner)
        sequence = _seed_sequence(db, org.id)
        reminder_engine.assign_sequence_and_schedule(db, invoice, sequence)
        settings = reminder_engine.get_or_create_org_settings(db, org.id)
        settings.contact_window_enabled = False
        settings.approval_mode = "first_batch"
        db.flush()

        monkeypatch.setattr(
            "app.intelligence.context_builder.build_reminder_context",
            lambda db_, inv, org_, sequence_step=0: None,
        )
        drafts = {"count": 0}

        def _draft(db_, schedule):
            drafts["count"] += 1
            return {"subject": "Original", "body": "Original body", "provider": "template", "template_id": None}

        monkeypatch.setattr("app.tasks.process_reminders.draft_reminder_content", _draft)

        def _send(db_, org_id, invoice_id, client_id, subject, body, template_id=None, ai_provider_used=None):
            message = Message(
                org_id=org_id,
                invoice_id=invoice_id,
                client_id=client_id,
                subject=subject,
                body=body,
                channel="email",
                status="sent",
                sent_at=datetime.now(timezone.utc),
            )
            db_.add(message)
            db_.flush()
            return message

        monkeypatch.setattr("app.tasks.process_reminders.create_and_send_message", _send)
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        assert execute_job(db, job)["status"] == "awaiting_approval"
        db.commit()
        row = db.query(
            ReminderSchedule
        ).filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.step_index == 0,
        ).one()

        queue = client.get("/api/v1/approval-queue", headers=headers)
        assert queue.status_code == 200, queue.text
        assert [item["id"] for item in queue.json()] == [row.id]

        approved = client.post(
            f"/api/v1/approval-queue/{row.id}/approve",
            json={"subject": "Edited subject", "body": "Edited body"},
            headers=headers,
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["draft_body"] == "Edited body"
        db.expire_all()
        row = db.query(ReminderSchedule).filter(ReminderSchedule.id == row.id).one()
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        assert row.status == "pending"
        assert row.approved_at is not None
        assert job.status == "pending"
        assert execute_job(db, job)["status"] == "sent"
        assert drafts["count"] == 1
        assert db.query(Message).filter(Message.invoice_id == invoice.id).one().body == "Edited body"
        actions = {a.action for a in db.query(AuditLog).filter(AuditLog.org_id == org.id).all()}
        assert {"reminder_awaiting_approval", "reminder_approved"} <= actions

    def test_reject_cancels_queued_draft(self, db, monkeypatch):
        headers = _auth_headers()
        org = db.query(Organization).one()
        owner = db.query(User).filter(User.id == org.owner_user_id).one()
        _, _, _, invoice = _seed_invoice(db, org=org, owner=owner)
        sequence = _seed_sequence(db, org.id)
        reminder_engine.assign_sequence_and_schedule(db, invoice, sequence)
        settings = reminder_engine.get_or_create_org_settings(db, org.id)
        settings.contact_window_enabled = False
        settings.approval_mode = "first_batch"
        monkeypatch.setattr(
            "app.intelligence.context_builder.build_reminder_context",
            lambda db_, inv, org_, sequence_step=0: None,
        )
        monkeypatch.setattr(
            "app.tasks.process_reminders.draft_reminder_content",
            lambda db_, schedule: {"subject": "Draft", "body": "Draft body", "provider": "template", "template_id": None},
        )
        job = db.query(ReminderJob).filter(ReminderJob.invoice_id == invoice.id).one()
        assert execute_job(db, job)["status"] == "awaiting_approval"
        db.commit()
        row = db.query(
            ReminderSchedule
        ).filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.step_index == 0,
        ).one()
        rejected = client.post(f"/api/v1/approval-queue/{row.id}/reject", headers=headers)
        assert rejected.status_code == 200, rejected.text
        db.expire_all()
        row = db.query(ReminderSchedule).filter(ReminderSchedule.id == row.id).one()
        assert row.status == "cancelled"
        assert row.skip_reason == "approval_rejected"
        assert db.query(AuditLog).filter(AuditLog.action == "reminder_rejected").count() == 1

    def test_manual_bypass_sends_without_parking(self, db, monkeypatch):
        _, invoice, _, job, _ = _prepare_job(db, monkeypatch)
        assert execute_job(db, job, bypass_approval=True)["status"] == "sent"
        row = db.query(
            ReminderSchedule
        ).filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.step_index == 0,
        ).one()
        assert row.status == "sent"
        assert db.query(Message).filter(Message.invoice_id == invoice.id).count() == 1


class TestAnchorGeneration:
    def test_ai_prompt_includes_rendered_anchor(self, monkeypatch):
        from types import SimpleNamespace

        from app.services.ai.provider import generate_reminder

        prompts = []
        monkeypatch.setattr("app.services.ai.provider.call_kimi", lambda prompt: prompts.append(prompt) or "Custom draft")
        invoice = SimpleNamespace(number="INV-1", amount=120, currency="USD", due_date=None)
        recipient = SimpleNamespace(name="Avery Client")
        draft = generate_reminder(
            invoice=invoice,
            client=recipient,
            client_profile=None,
            step_index=0,
            tone="friendly",
            anchor_body="Hello Avery, this is our usual friendly reminder.",
        )
        assert draft.provider == "kimi"
        assert prompts and "Match the voice, length, and structure" in prompts[0]
        assert "Hello Avery, this is our usual friendly reminder." in prompts[0]

    def test_static_fallback_returns_rendered_anchor(self, db, monkeypatch):
        _, org, _, invoice = _seed_invoice(db)
        sequence = _seed_sequence(db, org.id)
        reminder_engine.assign_sequence_and_schedule(db, invoice, sequence)
        row = db.query(
            ReminderSchedule
        ).filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.step_index == 0,
        ).one()
        monkeypatch.setattr("app.services.ai.provider.call_kimi", lambda prompt: None)
        monkeypatch.setattr("app.services.ai.provider.call_zai", lambda prompt: None)
        result = draft_reminder_content(db, row)
        assert result["provider"] == "template"
        assert "Avery" in result["body"]
        assert invoice.number in result["body"]
