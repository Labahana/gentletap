"""Phase 2 automation tests: AI fallback, contact window, payment stop, profiling."""

import pytest
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.invoice import Invoice
from app.models.client import Client
from app.models.reminder_schedule import ReminderSchedule
from app.models.sequence import Sequence
from app.services.ai.tones import contains_banned_phrases, select_tone
from app.services.ai.provider import generate_reminder
from app.services.client_profile import compute_reliability_score, recompute_client_profile
from app.services.reminder_engine import is_within_contact_window, next_valid_send_time
from app.services.payment_detect import auto_stop_on_payment
from app.services.autopilot import ensure_autopilot_assets
from app.services.reminder_engine import get_or_create_org_settings, assign_sequence_and_schedule

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_phase2.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def _auth_headers():
    res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": f"p2_{datetime.now().timestamp()}@gentletap.com",
            "password": "securepassword123",
            "full_name": "Phase Two",
            "organization_name": "P2 Org",
        },
    )
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


def test_banned_phrases_and_tone_selection():
    assert contains_banned_phrases("We may take legal action")
    assert not contains_banned_phrases("Please pay when you can")
    assert select_tone(0, reliability_score=50) == "warm"
    assert select_tone(14, reliability_score=50) == "firm"
    assert select_tone(14, reliability_score=90) == "professional"  # softened for reliable clients
    assert select_tone(21, dispute_count=1, reliability_score=50) == "firm"


def test_ai_fallback_to_static_template():
    class Inv:
        number = "1001"
        amount = 250
        currency = "USD"
        due_date = date.today() - timedelta(days=5)

    class Cli:
        name = "Alex Rivera"

    draft = generate_reminder(
        invoice=Inv(),
        client=Cli(),
        client_profile=None,
        step_index=1,
        tone="friendly",
        owner_name="Sam",
    )
    assert draft.provider == "template"
    assert "1001" in draft.body or "invoice" in draft.body.lower()
    assert not contains_banned_phrases(draft.body)


def test_contact_window_holds_late_night():
    # 11pm America/New_York
    late = datetime(2026, 6, 15, 3, 0, tzinfo=timezone.utc)  # 11pm EDT previous day-ish
    # Use explicit local construction via next_valid_send_time
    from zoneinfo import ZoneInfo

    local_11pm = datetime(2026, 6, 15, 23, 0, tzinfo=ZoneInfo("America/New_York"))
    assert not is_within_contact_window(local_11pm, tz_name="America/New_York")
    nxt = next_valid_send_time(local_11pm, tz_name="America/New_York", best_send_hour=9)
    local_next = nxt.astimezone(ZoneInfo("America/New_York"))
    assert local_next.hour == 9
    assert local_next.date() == date(2026, 6, 16)


def test_payment_auto_stops_reminders():
    headers = _auth_headers()
    c = client.post("/api/v1/clients", json={"name": "Pay Client", "email": "pay@ex.com"}, headers=headers)
    cid = c.json()["id"]
    inv = client.post(
        "/api/v1/invoices",
        json={
            "number": "INV-P2-1",
            "client_id": cid,
            "amount": 100,
            "due_date": str(date.today() - timedelta(days=3)),
        },
        headers=headers,
    )
    assert inv.status_code == 200
    iid = inv.json()["id"]

    seq = client.post(
        "/api/v1/sequences",
        json={
            "name": "Chase",
            "steps": [
                {"day_offset": 0, "tone": "warm", "enabled": True},
                {"day_offset": 3, "tone": "friendly", "enabled": True},
            ],
        },
        headers=headers,
    )
    sid = seq.json()["id"]
    client.post(f"/api/v1/sequences/{sid}/assign", json={"invoice_id": iid}, headers=headers)

    schedule = client.get(f"/api/v1/invoices/{iid}/schedule", headers=headers)
    assert schedule.status_code == 200
    assert len(schedule.json()["items"]) >= 1
    assert all(i["status"] == "pending" for i in schedule.json()["items"])

    paid = client.post(f"/api/v1/invoices/{iid}/mark-paid", headers=headers)
    assert paid.status_code == 200
    assert paid.json()["status"] == "paid"

    schedule2 = client.get(f"/api/v1/invoices/{iid}/schedule", headers=headers)
    assert all(i["status"] == "cancelled" for i in schedule2.json()["items"])


def test_client_profile_after_paid_invoices():
    headers = _auth_headers()
    c = client.post("/api/v1/clients", json={"name": "Score Client", "email": "score@ex.com"}, headers=headers)
    cid = c.json()["id"]

    for i in range(3):
        inv = client.post(
            "/api/v1/invoices",
            json={
                "number": f"S-{i}",
                "client_id": cid,
                "amount": 50 + i,
                "due_date": str(date.today() - timedelta(days=10)),
            },
            headers=headers,
        )
        client.post(f"/api/v1/invoices/{inv.json()['id']}/mark-paid", headers=headers)

    profile = client.get(f"/api/v1/clients/{cid}/profile", headers=headers)
    assert profile.status_code == 200
    data = profile.json()
    assert data["total_paid"] == 3
    assert data["total_invoices"] == 3
    assert 0 <= data["reliability_score"] <= 100


def test_autopilot_mode_bootstrap():
    headers = _auth_headers()
    res = client.patch(
        "/api/v1/settings/operation-mode",
        json={"mode": "autopilot", "confirm": True},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["mode"] == "autopilot"

    templates = client.get("/api/v1/templates", headers=headers)
    tones = {t["tone"] for t in templates.json()}
    assert {"warm", "friendly", "professional", "firm", "urgent"}.issubset(tones)

    sequences = client.get("/api/v1/sequences", headers=headers)
    assert any(s.get("is_default") and s.get("auto_assign") for s in sequences.json())


def test_opt_out_unsubscribe():
    headers = _auth_headers()
    from app.services.email import make_unsubscribe_token
    from app.database import SessionLocal

    # Create client via API then build token with org id from settings
    settings = client.get("/api/v1/settings", headers=headers).json()
    c = client.post(
        "/api/v1/clients",
        json={"name": "Opt Out", "email": "optout@ex.com"},
        headers=headers,
    )
    # Get org_id from client
    db = TestingSessionLocal()
    try:
        row = db.query(Client).filter(Client.email == "optout@ex.com").first()
        org_id = row.org_id
    finally:
        db.close()

    token = make_unsubscribe_token(org_id, "optout@ex.com")
    res = client.get(f"/api/v1/webhooks/unsubscribe?token={token}")
    assert res.status_code == 200
    assert res.json()["status"] == "unsubscribed"


def test_dashboard_phase2_fields():
    headers = _auth_headers()
    summary = client.get("/api/v1/dashboard/summary", headers=headers)
    assert summary.status_code == 200
    body = summary.json()
    assert "expected_collections_7d" in body
    assert "active_campaigns_count" in body
    escalations = client.get("/api/v1/dashboard/escalations", headers=headers)
    assert escalations.status_code == 200


def test_reliability_formula():
    assert compute_reliability_score(0, 0, 0) == 100
    assert compute_reliability_score(10, 2, 1) == max(0, 100 - 20 - 10 - 10)
