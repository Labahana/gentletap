"""Admin MRR must come from real active subscriptions, not the org.plan column."""

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
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.api.admin import admin_stats
from app.models.organization import Organization
from app.models.subscription import Subscription
from app.models.user import User

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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


def _org(db, plan="starter", billing_period=None):
    user = User(email=f"u{datetime.now(timezone.utc).timestamp()}@t.com", full_name="U", password_hash="x")
    db.add(user)
    db.flush()
    org = Organization(name="Org", owner_user_id=user.id, plan=plan, billing_period=billing_period)
    db.add(org)
    db.flush()
    return org


def _mrr(db):
    return admin_stats(True, db)["mrr"]


def test_paid_plan_without_subscription_counts_zero(db):
    _org(db, plan="team")
    assert _mrr(db) == 0.0


def test_active_subscription_counts(db):
    org = _org(db, plan="team")
    db.add(Subscription(org_id=org.id, plan="team", status="active"))
    db.flush()
    assert _mrr(db) == 59


def test_cancelled_subscription_excluded(db):
    org = _org(db, plan="pro")
    db.add(Subscription(org_id=org.id, plan="pro", status="cancelled"))
    db.flush()
    assert _mrr(db) == 0.0


def test_lapsed_period_excluded(db):
    org = _org(db, plan="pro")
    db.add(
        Subscription(
            org_id=org.id,
            plan="pro",
            status="active",
            current_period_end=datetime.now(timezone.utc) - timedelta(days=1),
        )
    )
    db.flush()
    assert _mrr(db) == 0.0


def test_annual_uses_monthly_equivalent(db):
    org = _org(db, plan="pro", billing_period="annual")
    db.add(Subscription(org_id=org.id, plan="pro", status="active"))
    db.flush()
    assert _mrr(db) == 16
