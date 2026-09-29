"""Phase 13: admin console endpoints — gating, jobs console, org/user controls."""

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("PADDLE_API_KEY", "test")
os.environ.setdefault("PADDLE_CLIENT_TOKEN", "test")

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.api import admin as admin_mod
from app.api.admin import require_admin_flexible
from app.api.auth import login as auth_login
from app.api.deps import get_current_user_and_org, create_access_token, hash_password
from app.models.audit_log import AuditLog
from app.models.connection import Connection
from app.models.invoice import Invoice
from app.models.client import Client
from app.models.message import Message
from app.models.organization import Organization
from app.models.org_settings import OrgSettings
from app.models.reminder_job import ReminderJob
from app.models.subscription import Subscription
from app.models.user import User

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

ADMIN_EMAIL = "root@example.com"
ADMIN = {"mode": "api_key", "email": "root@example.com", "ip": "1.2.3.4"}


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    s = TestingSessionLocal()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def admin_client(db, client, monkeypatch):
    """TestClient authenticated with a real JWT for an ADMIN_EMAILS member."""
    monkeypatch.setattr(admin_mod.settings, "admin_emails", [ADMIN_EMAIL])
    user = _user(db, email=ADMIN_EMAIL)
    org = _org(db, owner=user)
    token = create_access_token(user.id, org.id, user.email)
    client.headers["Authorization"] = f"Bearer {token}"
    return client


def _user(db, email=None, is_active=True, password="pw12345"):
    email = email or f"u{uuid.uuid4().hex[:12]}@t.com"
    u = User(email=email, full_name="U", password_hash=hash_password(password), is_active=is_active)
    db.add(u)
    db.flush()
    return u


def _org(db, owner=None, plan="starter"):
    owner = owner or _user(db)
    o = Organization(name="Org", owner_user_id=owner.id, plan=plan)
    db.add(o)
    db.flush()
    return o


def _invoice(db, org):
    c = Client(org_id=org.id, name="C", email="c@x.com")
    db.add(c)
    db.flush()
    inv = Invoice(org_id=org.id, client_id=c.id, number="INV-1", amount=100, balance=100)
    db.add(inv)
    db.flush()
    return inv


# ---------------------------------------------------------------------------
# Access gating: 401 missing token, 404 authenticated non-admin
# ---------------------------------------------------------------------------

class _Req:
    headers = {"x-forwarded-for": "7.7.7.7"}
    client = type("C", (), {"host": "9.9.9.9"})()


def test_gate_401_without_token(db):
    with pytest.raises(HTTPException) as ei:
        require_admin_flexible(_Req(), None, None, db)
    assert ei.value.status_code == 401


def test_gate_404_for_valid_non_admin_token(db):
    user = _user(db, email="mere@t.com")
    org = _org(db, owner=user)
    token = create_access_token(user.id, org.id, user.email)
    with pytest.raises(HTTPException) as ei:
        require_admin_flexible(_Req(), None, token, db)
    assert ei.value.status_code == 404


def test_gate_ok_for_admin_token(db, monkeypatch):
    monkeypatch.setattr(admin_mod.settings, "admin_emails", [ADMIN_EMAIL])
    user = _user(db, email=ADMIN_EMAIL)
    org = _org(db, owner=user)
    token = create_access_token(user.id, org.id, user.email)
    result = require_admin_flexible(_Req(), None, token, db)
    assert result["mode"] == "jwt"
    assert result["email"] == ADMIN_EMAIL


def test_non_admin_gets_404_via_http(db, client):
    user = _user(db, email="mere@t.com")
    org = _org(db, owner=user)
    token = create_access_token(user.id, org.id, user.email)
    r = client.get("/api/v1/admin/orgs", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404


def test_missing_token_gets_401_via_http(client):
    assert client.get("/api/v1/admin/orgs").status_code == 401


def test_access_check_is_non_throwing(client):
    r = client.get("/api/v1/admin/access-check")
    assert r.status_code == 200
    assert r.json() == {"is_admin": False, "email": None}


# ---------------------------------------------------------------------------
# Stats / timeseries
# ---------------------------------------------------------------------------

def test_stats_include_job_and_growth_metrics(db, monkeypatch):
    monkeypatch.setattr(admin_mod, "_mrr", lambda db: 42.0)
    org = _org(db)
    now = datetime.now(timezone.utc)
    db.add(ReminderJob(org_id=org.id, invoice_id="i1", sequence_step=1,
                       scheduled_for=now, status="pending"))
    db.add(ReminderJob(org_id=org.id, invoice_id="i2", sequence_step=1,
                       scheduled_for=now, status="processing",
                       updated_at=now - timedelta(minutes=30)))
    db.flush()
    stats = admin_mod.admin_stats(ADMIN, db)
    assert stats["mrr"] == 42.0
    assert stats["pending_jobs"] == 1
    assert stats["stuck_jobs"] == 1
    assert stats["signups_7d"] >= 1
    assert stats["subscription_health"]["active"] == 0


def test_timeseries_buckets_today(db):
    org = _org(db)
    _user(db)
    db.add(Message(org_id=org.id, invoice_id="x", client_id="y", subject="s",
                   body="b", status="sent"))
    db.flush()
    ts = admin_mod.admin_timeseries(ADMIN, db, days=7)
    assert len(ts["days"]) == 7
    assert sum(ts["signals"]["messages"]) == 1
    assert sum(ts["signals"]["signups"]) == 2  # org owner + explicit user


def test_deliverability_rates(db):
    org = _org(db)
    inv = _invoice(db, org)
    for i, status in enumerate(("sent", "delivered", "opened", "clicked", "failed", "bounced")):
        db.add(Message(id=f"m-{i}", org_id=org.id, invoice_id=inv.id, client_id=inv.client_id,
                       subject="s", body="b", status=status, channel="email"))
    db.flush()
    out = admin_mod.admin_deliverability(ADMIN, db, days=30)
    email = next(c for c in out["channels"] if c["channel"] == "email")
    assert email["total"] == 6
    assert email["sent"] == 4          # sent+delivered+opened+clicked
    assert email["delivered"] == 3     # delivered+opened+clicked
    assert email["opened"] == 1
    assert email["clicked"] == 1
    assert email["failed"] == 2        # failed+bounced
    assert email["bounced"] == 1
    assert email["delivery_rate"] == 50.0
    assert email["failure_rate"] == round(2 * 100.0 / 6, 1)


# ---------------------------------------------------------------------------
# Health (status must be plain strings, not dicts — regression for React #31)
# ---------------------------------------------------------------------------

def test_admin_health_flattens_status(monkeypatch):
    from app.api import health as health_mod

    monkeypatch.setattr(health_mod, "check_db", lambda: {"status": "ok"})
    monkeypatch.setattr(health_mod, "check_redis", lambda: {"status": "error", "detail": "boom"})
    monkeypatch.setattr(health_mod, "check_celery", lambda: {"status": "ok", "workers": ["w1", "w2"]})
    out = admin_mod.admin_health(ADMIN)
    assert out["db"] == "ok"
    assert out["redis"] == "error"
    assert out["celery"] == "ok"
    assert out["workers"] == ["w1", "w2"]
    assert all(isinstance(out[k], str) for k in ("api", "db", "redis", "celery"))


# ---------------------------------------------------------------------------
# Orgs list + detail
# ---------------------------------------------------------------------------

def test_orgs_list_has_quota_owner_and_search(db):
    owner = _user(db, email="findme@t.com")
    org = _org(db, owner=owner)
    out = admin_mod.list_orgs(ADMIN, db, search=None, limit=25, offset=0)
    item = out["items"][0]
    assert item["collections_quota"] == org.collections_quota
    assert item["owner_email"] == "findme@t.com"
    hit = admin_mod.list_orgs(ADMIN, db, search="findme", limit=25, offset=0)
    assert hit["total"] == 1
    miss = admin_mod.list_orgs(ADMIN, db, search="nomatchxyz", limit=25, offset=0)
    assert miss["total"] == 0


def test_org_detail_connection_warnings(db):
    org = _org(db)
    now = datetime.now(timezone.utc)
    db.add(Connection(org_id=org.id, provider="quickbooks", token_encrypted="t",
                      refresh_token_encrypted="r", status="active",
                      token_expires_at=now + timedelta(days=3)))
    db.add(Connection(org_id=org.id, provider="freshbooks", token_encrypted="t",
                      refresh_token_encrypted="r", status="active",
                      token_expires_at=now - timedelta(days=1)))
    db.flush()
    detail = admin_mod.org_detail(org.id, ADMIN, db)
    conns = {c["provider"]: c for c in detail["connections"]}
    assert conns["quickbooks"]["token_expiring_soon"] is True
    assert conns["freshbooks"]["token_expired"] is True
    assert "counts" in detail and "settings" in detail


# ---------------------------------------------------------------------------
# Control actions
# ---------------------------------------------------------------------------

def test_pause_cancels_pending_jobs_and_audits(db):
    org = _org(db)
    job = ReminderJob(org_id=org.id, invoice_id="i1", sequence_step=1,
                      scheduled_for=datetime.now(timezone.utc), status="pending")
    db.add(job)
    db.flush()
    out = admin_mod.pause_reminders(org.id, ADMIN, db, reason="incident", minutes=None)
    assert out["jobs_cancelled"] == 1
    db.refresh(job)
    assert job.status == "cancelled"
    row = db.query(OrgSettings).filter(OrgSettings.org_id == org.id).first()
    assert row.pause_all is True and row.pause_reason == "incident"
    log = db.query(AuditLog).filter(AuditLog.action == "admin.pause_reminders").first()
    assert log.ip == "1.2.3.4" and log.org_id == org.id


def test_resume_clears_pause(db):
    org = _org(db)
    admin_mod.pause_reminders(org.id, ADMIN, db, reason="x", minutes=30)
    admin_mod.resume_reminders(org.id, ADMIN, db)
    row = db.query(OrgSettings).filter(OrgSettings.org_id == org.id).first()
    assert row.pause_all is False and row.pause_until is None


def test_force_sync_enqueues_active_connections_only(db, monkeypatch):
    org = _org(db)
    sent = []
    monkeypatch.setattr(admin_mod.celery_app, "send_task",
                        lambda name, args=None, countdown=None: sent.append((name, args)))
    db.add(Connection(org_id=org.id, provider="quickbooks", token_encrypted="t",
                      refresh_token_encrypted="r", status="active"))
    db.add(Connection(org_id=org.id, provider="freshbooks", token_encrypted="t",
                      refresh_token_encrypted="r", status="disconnected"))
    db.flush()
    out = admin_mod.force_sync(org.id, ADMIN, db)
    assert out["enqueued"] == 1
    assert sent[0][0] == "app.tasks.sync_invoices.sync_invoices_task"


def test_force_sync_without_connections_is_400(db):
    org = _org(db)
    with pytest.raises(HTTPException) as ei:
        admin_mod.force_sync(org.id, ADMIN, db)
    assert ei.value.status_code == 400


def test_reset_counters(db):
    org = _org(db)
    org.collections_used_this_period = 7
    org.whatsapp_used_this_period = 3
    db.commit()
    admin_mod.reset_counters(org.id, ADMIN, db)
    db.refresh(org)
    assert org.collections_used_this_period == 0 and org.whatsapp_used_this_period == 0


def test_change_plan_rejects_unknown(db):
    org = _org(db)
    with pytest.raises(HTTPException) as ei:
        admin_mod.change_plan(org.id, admin_mod.PlanRequest(plan="ultra"), ADMIN, db)
    assert ei.value.status_code == 400


def test_change_plan_applies_quotas(db):
    org = _org(db)
    out = admin_mod.change_plan(org.id, admin_mod.PlanRequest(plan="pro", billing_period="annual"), ADMIN, db)
    assert out["plan"] == "pro"
    db.refresh(org)
    assert org.billing_period == "annual"
    assert org.seats_limit > 0
    log = db.query(AuditLog).filter(AuditLog.action == "admin.change_plan").first()
    assert log.details["to"] == "pro"


# ---------------------------------------------------------------------------
# User controls + suspension enforcement
# ---------------------------------------------------------------------------

def test_suspend_blocks_admin_emails(db, monkeypatch):
    monkeypatch.setattr(admin_mod.settings, "admin_emails", [ADMIN_EMAIL])
    admin_user = _user(db, email=ADMIN_EMAIL)
    with pytest.raises(HTTPException) as ei:
        admin_mod.suspend_user(admin_user.id, ADMIN, db)
    assert ei.value.status_code == 400


def test_suspend_and_unsuspend(db):
    user = _user(db, email="bad@t.com")
    admin_mod.suspend_user(user.id, ADMIN, db)
    db.refresh(user)
    assert user.is_active is False
    admin_mod.unsuspend_user(user.id, ADMIN, db)
    db.refresh(user)
    assert user.is_active is True


def test_login_rejects_suspended_user(db):
    user = _user(db, email="bad@t.com", is_active=False)
    with pytest.raises(HTTPException) as ei:
        auth_login(type("Req", (), {"email": user.email, "password": "pw12345"})(), db)
    assert ei.value.status_code == 403


def test_token_auth_rejects_suspended_user(db):
    user = _user(db, email="bad@t.com", is_active=False)
    org = _org(db, owner=user)
    token = create_access_token(user.id, org.id, user.email)
    with pytest.raises(HTTPException) as ei:
        get_current_user_and_org(token, db)
    assert ei.value.status_code == 403


def test_request_and_cancel_deletion(db):
    user = _user(db, email="gone@t.com")
    org = _org(db, owner=user)
    admin_mod.request_user_deletion(user.id, ADMIN, db)
    db.refresh(user), db.refresh(org)
    assert user.is_deleting is True and org.deletion_requested_at is not None
    admin_mod.cancel_user_deletion(user.id, ADMIN, db)
    db.refresh(user), db.refresh(org)
    assert user.is_deleting is False and org.deletion_requested_at is None


# ---------------------------------------------------------------------------
# Jobs console
# ---------------------------------------------------------------------------

def test_jobs_status_filter_including_stuck(db):
    org = _org(db)
    now = datetime.now(timezone.utc)
    db.add(ReminderJob(org_id=org.id, invoice_id="a", sequence_step=1,
                       scheduled_for=now, status="pending"))
    fresh = ReminderJob(org_id=org.id, invoice_id="b", sequence_step=1,
                        scheduled_for=now, status="processing")
    stale = ReminderJob(org_id=org.id, invoice_id="c", sequence_step=1,
                        scheduled_for=now, status="processing",
                        updated_at=now - timedelta(minutes=20))
    db.add_all([fresh, stale])
    db.flush()
    out = admin_mod.list_jobs(ADMIN, db, status_f=None, org_id=None, limit=50, offset=0)
    assert out["counts"]["pending"] == 1
    assert out["counts"]["stuck"] == 1
    stuck_only = admin_mod.list_jobs(ADMIN, db, status_f="stuck", org_id=None, limit=50, offset=0)
    assert stuck_only["total"] == 1
    assert stuck_only["items"][0]["stuck"] is True


def test_requeue_single_job(db):
    org = _org(db)
    job = ReminderJob(org_id=org.id, invoice_id="a", sequence_step=2,
                      scheduled_for=datetime.now(timezone.utc), status="failed",
                      attempts=3, last_error="boom")
    db.add(job)
    db.flush()
    admin_mod.requeue_job(job.id, ADMIN, db)
    db.refresh(job)
    assert job.status == "pending" and job.attempts == 0 and job.last_error is None
    assert db.query(AuditLog).filter(AuditLog.action == "admin.requeue_job").count() == 1


def test_requeue_sent_job_is_400(db):
    org = _org(db)
    job = ReminderJob(org_id=org.id, invoice_id="a", sequence_step=1,
                      scheduled_for=datetime.now(timezone.utc), status="sent")
    db.add(job)
    db.flush()
    with pytest.raises(HTTPException) as ei:
        admin_mod.requeue_job(job.id, ADMIN, db)
    assert ei.value.status_code == 400


def test_requeue_stuck_bulk(db):
    org = _org(db)
    now = datetime.now(timezone.utc)
    stale = [ReminderJob(org_id=org.id, invoice_id=f"s{i}", sequence_step=1,
                         scheduled_for=now, status="processing",
                         updated_at=now - timedelta(minutes=30)) for i in range(3)]
    db.add_all(stale)
    db.flush()
    out = admin_mod.requeue_stuck(ADMIN, db)
    assert out["requeued"] == 3
    assert all(j.status == "pending" for j in stale)


# ---------------------------------------------------------------------------
# Audit log + impersonate (over HTTP, as admin JWT)
# ---------------------------------------------------------------------------

def test_audit_log_shows_admin_rows_with_ip(db, admin_client):
    org = _org(db)
    admin_mod.pause_reminders(org.id, ADMIN, db, reason="r", minutes=None)
    r = admin_client.get("/api/v1/admin/audit-log")
    assert r.status_code == 200
    row = next(a for a in r.json()["items"] if a["action"] == "admin.pause_reminders")
    assert row["ip"] == "1.2.3.4"
    assert row["details"]["reason"] == "r"


def test_impersonate_http_writes_audit(db, admin_client):
    target_owner = _user(db, email="target@t.com")
    target = _org(db, owner=target_owner)
    r = admin_client.post(f"/api/v1/admin/orgs/{target.id}/impersonate")
    assert r.status_code == 200
    assert r.json()["access_token"]
    log = db.query(AuditLog).filter(AuditLog.action == "admin.impersonate").first()
    assert log is not None and log.org_id == target.id
