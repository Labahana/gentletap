"""Phase 8: Affiliate hybrid + tiered commissions — founder tier, performance tiers, first-month bounty."""

import os
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("PADDLE_API_KEY", "test")
os.environ.setdefault("PADDLE_CLIENT_TOKEN", "test")

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.models.affiliate import Affiliate, AffiliateCommission
from app.services.affiliates import (
    effective_commission_rate,
    founder_tier_info,
    rate_for_event,
)

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
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


def make_affiliate(db: Session, *, approved_at=None, commission_rate=Decimal("0.30")) -> Affiliate:
    a = Affiliate(
        id=str(uuid4()),
        email=f"a{uuid4().hex[:8]}@example.com",
        password_hash="x",
        name="Test Partner",
        status="active",
        commission_rate=commission_rate,
        approved_at=approved_at,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def add_month_revenue(db: Session, affiliate: Affiliate, gross: str) -> None:
    db.add(
        AffiliateCommission(
            id=str(uuid4()),
            affiliate_id=affiliate.id,
            referral_id=str(uuid4()),
            paddle_transaction_id=f"txn_{uuid4().hex[:8]}",
            event_type="renewal",
            gross_amount=Decimal(gross),
            commission_amount=Decimal(gross) * Decimal("0.30"),
            currency="USD",
            status="pending",
            created_at=datetime.now(timezone.utc),
        )
    )
    db.commit()


NOW = datetime.now(timezone.utc)


def test_first_25_approved_partners_get_founder_rate(db):
    a = make_affiliate(db, approved_at=NOW - timedelta(days=1))
    info = founder_tier_info(db, a)
    assert info["is_founder"] and info["active"]
    assert info["rate"] == 0.40 and info["months"] == 6
    assert effective_commission_rate(db, a) == Decimal("0.40")


def test_slot_25_is_founder_and_slot_26_is_not(db):
    base = NOW - timedelta(days=2)
    for i in range(24):
        make_affiliate(db, approved_at=base + timedelta(minutes=i))
    slot_25 = make_affiliate(db, approved_at=base + timedelta(minutes=24))
    slot_26 = make_affiliate(db, approved_at=base + timedelta(minutes=25))
    assert founder_tier_info(db, slot_25)["active"] is True
    assert effective_commission_rate(db, slot_25) == Decimal("0.40")
    assert founder_tier_info(db, slot_26)["is_founder"] is False
    assert effective_commission_rate(db, slot_26) == Decimal("0.30")


def test_founder_rate_expires_after_six_months(db):
    a = make_affiliate(db, approved_at=NOW - timedelta(days=200))
    info = founder_tier_info(db, a)
    assert info["is_founder"] is True
    assert info["active"] is False
    assert effective_commission_rate(db, a) == Decimal("0.30")


def test_pending_applications_do_not_consume_founder_slots(db):
    a = make_affiliate(db, approved_at=None)
    assert founder_tier_info(db, a)["is_founder"] is False


def test_first_month_bounty_beats_founder_rate(db):
    a = make_affiliate(db, approved_at=NOW - timedelta(days=1))
    assert rate_for_event(db, a, "initial") == Decimal("0.50")
    assert rate_for_event(db, a, "renewal") == Decimal("0.40")


def test_tier3_beats_base_but_not_first_month(db):
    a = make_affiliate(db, approved_at=None)
    add_month_revenue(db, a, "2500")
    assert effective_commission_rate(db, a) == Decimal("0.40")


def test_founder_rate_wins_over_tier2(db):
    a = make_affiliate(db, approved_at=NOW - timedelta(days=1))
    add_month_revenue(db, a, "600")
    assert effective_commission_rate(db, a) == Decimal("0.40")


def test_manual_rate_above_founder_still_wins(db):
    a = make_affiliate(
        db, approved_at=NOW - timedelta(days=1), commission_rate=Decimal("0.45")
    )
    assert effective_commission_rate(db, a) == Decimal("0.45")
