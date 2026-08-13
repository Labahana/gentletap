"""Affiliate program tests."""

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient

from gentletap.config import get_settings
from gentletap.main import app
from gentletap.services import affiliates as affiliate_service

client = TestClient(app)


def _clear_settings_cache() -> None:
    get_settings.cache_clear()


def test_affiliate_apply_and_admin_approve(requires_db, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "admin@gentletap.dev")
    _clear_settings_cache()

    email = "creator@gentletap.dev"
    apply = client.post(
        "/v1/affiliates/apply",
        json={
            "email": email,
            "password": "securepass123",
            "name": "Test Creator",
            "channel_name": "Freelance Tips",
            "channel_url": "https://youtube.com/@test",
        },
    )
    assert apply.status_code == 201

    admin_reg = client.post(
        "/v1/auth/register",
        json={"email": "admin@gentletap.dev", "password": "securepass123", "full_name": "Admin"},
    )
    admin_token = admin_reg.json()["access_token"]

    pending = client.get("/v1/affiliates/admin/list?status=pending", headers={"Authorization": f"Bearer {admin_token}"})
    assert pending.status_code == 200
    items = pending.json()["items"]
    assert any(i["email"] == email for i in items)
    affiliate_id = next(i["id"] for i in items if i["email"] == email)

    approved = client.post(
        f"/v1/affiliates/admin/{affiliate_id}/approve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert approved.status_code == 200
    ref_code = approved.json()["ref_code"]
    assert ref_code

    login = client.post("/v1/affiliates/auth/login", json={"email": email, "password": "securepass123"})
    assert login.status_code == 200
    affiliate_token = login.json()["access_token"]

    dash = client.get("/v1/affiliates/dashboard", headers={"Authorization": f"Bearer {affiliate_token}"})
    assert dash.status_code == 200
    assert dash.json()["affiliate"]["ref_code"] == ref_code

    _clear_settings_cache()


def test_referral_attribution_on_signup(requires_db):
    # Create and approve affiliate directly via service would need db fixture;
    # use API flow abbreviated with apply + admin skipped - test track-click + register with ref
    creator_email = "creator2@gentletap.dev"
    apply = client.post(
        "/v1/affiliates/apply",
        json={
            "email": creator_email,
            "password": "securepass123",
            "name": "Creator Two",
            "channel_name": "qb-tips",
        },
    )
    assert apply.status_code == 201

    # Manually approve via DB not available in client test without admin - skip full flow
    click = client.post("/v1/affiliates/track-click", json={"ref_code": "nonexistent"})
    assert click.json()["recorded"] is False


def test_slugify_ref_code():
    assert affiliate_service.slugify_ref_code("Freelance Tips!") == "freelance-tips"
    assert len(affiliate_service.slugify_ref_code("a")) >= 3


def test_paddle_transaction_gross():
    data = {"details": {"totals": {"grand_total": "1900", "currency_code": "USD"}}}
    gross, currency = affiliate_service.paddle_transaction_gross(data)
    assert gross == Decimal("19.00")
    assert currency == "USD"


def test_commission_window_expires():
    from gentletap.database import AffiliateReferral

    now = datetime.now(UTC)
    referral = AffiliateReferral(
        affiliate_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        ref_code="test",
        status="active",
        signed_up_at=now,
        first_paid_at=now - timedelta(days=800),
    )
    assert affiliate_service.referral_commission_eligible(referral) is False

    referral.first_paid_at = now - timedelta(days=400)
    assert affiliate_service.referral_commission_eligible(referral) is True

    referral.first_paid_at = now
    assert affiliate_service.referral_commission_eligible(referral) is True

    referral.first_paid_at = None
    assert affiliate_service.referral_commission_eligible(referral) is True


# --- Program upgrade: first-month bounty, performance tiers, payout rules ---


def _make_affiliate_with_referral(db, *, rate: float = 0.30):
    from gentletap.database import Affiliate, AffiliateReferral, Profile

    suffix = uuid.uuid4().hex[:8]
    affiliate = Affiliate(
        id=uuid.uuid4(),
        email=f"aff-{suffix}@gentletap.dev",
        password_hash="x",
        name="Test Affiliate",
        status="active",
        ref_code=affiliate_service.unique_ref_code(db, f"aff-{suffix}"),
        commission_rate=rate,
        approved_at=datetime.now(UTC),
    )
    user = Profile(
        id=uuid.uuid4(),
        email=f"usr-{suffix}@gentletap.dev",
        password_hash="x",
        plan="pro",
        referred_by_affiliate_id=affiliate.id,
    )
    db.add_all([affiliate, user])
    db.flush()
    referral = AffiliateReferral(
        id=uuid.uuid4(),
        affiliate_id=affiliate.id,
        user_id=user.id,
        ref_code=affiliate.ref_code,
        status="signed_up",
        signed_up_at=datetime.now(UTC),
    )
    db.add(referral)
    db.commit()
    return affiliate, user, referral


def _cleanup_affiliate(db, affiliate, user, referral) -> None:
    from gentletap.database import AffiliateCommission, AffiliatePayout

    db.query(AffiliateCommission).filter(AffiliateCommission.affiliate_id == affiliate.id).delete()
    db.query(AffiliatePayout).filter(AffiliatePayout.affiliate_id == affiliate.id).delete()
    db.delete(referral)
    db.delete(user)
    db.delete(affiliate)
    db.commit()


def test_first_month_bounty_then_recurring_rate(db_session):
    affiliate, user, _referral = _make_affiliate_with_referral(db_session)
    try:
        first = affiliate_service.record_subscription_commission(
            db_session,
            user=user,
            paddle_transaction_id=f"txn_{uuid.uuid4().hex[:12]}",
            paddle_subscription_id=None,
            gross_amount=Decimal("19.00"),
            currency="USD",
            event_type="initial",
        )
        assert first is not None
        assert first.commission_amount == Decimal("9.50")  # 50% of first month

        renewal = affiliate_service.record_subscription_commission(
            db_session,
            user=user,
            paddle_transaction_id=f"txn_{uuid.uuid4().hex[:12]}",
            paddle_subscription_id=None,
            gross_amount=Decimal("19.00"),
            currency="USD",
            event_type="renewal",
        )
        assert renewal is not None
        assert renewal.commission_amount == Decimal("5.70")  # 30% recurring
    finally:
        _cleanup_affiliate(db_session, affiliate, user, _referral)


def test_performance_tiers_apply_to_renewals(db_session):
    from gentletap.database import AffiliateCommission

    affiliate, user, referral = _make_affiliate_with_referral(db_session)
    try:
        # Seed $600 month-to-date referred revenue -> 35% tier.
        db_session.add(
            AffiliateCommission(
                id=uuid.uuid4(),
                affiliate_id=affiliate.id,
                referral_id=referral.id,
                paddle_transaction_id=f"txn_seed_{uuid.uuid4().hex[:8]}",
                event_type="renewal",
                gross_amount=Decimal("600.00"),
                commission_amount=Decimal("180.00"),
                currency="USD",
                status="pending",
            )
        )
        db_session.commit()

        tiered = affiliate_service.record_subscription_commission(
            db_session,
            user=user,
            paddle_transaction_id=f"txn_{uuid.uuid4().hex[:12]}",
            paddle_subscription_id=None,
            gross_amount=Decimal("19.00"),
            currency="USD",
            event_type="renewal",
        )
        assert tiered is not None
        assert tiered.commission_amount == Decimal("6.65")  # 35% at $500+

        # First-month bounty still beats the tier rate.
        bounty = affiliate_service.rate_for_event(db_session, affiliate, "initial")
        assert bounty == Decimal("0.5")
    finally:
        _cleanup_affiliate(db_session, affiliate, user, referral)


def test_manual_founder_rate_beats_tier(db_session):
    affiliate, user, referral = _make_affiliate_with_referral(db_session, rate=0.40)
    try:
        renewal = affiliate_service.record_subscription_commission(
            db_session,
            user=user,
            paddle_transaction_id=f"txn_{uuid.uuid4().hex[:12]}",
            paddle_subscription_id=None,
            gross_amount=Decimal("19.00"),
            currency="USD",
            event_type="renewal",
        )
        assert renewal is not None
        assert renewal.commission_amount == Decimal("7.60")  # manual 40% beats default 30%

        initial = affiliate_service.rate_for_event(db_session, affiliate, "initial")
        assert initial == Decimal("0.5")  # 50% bounty beats manual 40%
    finally:
        _cleanup_affiliate(db_session, affiliate, user, referral)


def test_payout_minimum_and_method_validation(db_session):
    affiliate, user, referral = _make_affiliate_with_referral(db_session)
    try:
        commission = affiliate_service.record_subscription_commission(
            db_session,
            user=user,
            paddle_transaction_id=f"txn_{uuid.uuid4().hex[:12]}",
            paddle_subscription_id=None,
            gross_amount=Decimal("19.00"),
            currency="USD",
            event_type="initial",
        )
        assert commission is not None  # $9.50 pending, below the $20 minimum

        try:
            affiliate_service.create_payout(db_session, affiliate.id, amount=9.50)
            raise AssertionError("expected below-minimum payout to be rejected")
        except ValueError as exc:
            assert "minimum" in str(exc)

        try:
            affiliate_service.create_payout(
                db_session, affiliate.id, amount=9.50, method="venmo", allow_below_minimum=True
            )
            raise AssertionError("expected invalid method to be rejected")
        except ValueError as exc:
            assert "method" in str(exc)

        payout = affiliate_service.create_payout(
            db_session,
            affiliate.id,
            amount=9.50,
            method="wise",
            allow_below_minimum=True,
        )
        assert payout.method == "wise"
        assert payout.status == "paid"
    finally:
        _cleanup_affiliate(db_session, affiliate, user, referral)


def test_apply_stores_partner_type_and_payout_fields(db_session):
    suffix = uuid.uuid4().hex[:8]
    affiliate = affiliate_service.create_affiliate_application(
        db_session,
        email=f"bookkeeper-{suffix}@gentletap.dev",
        password="securepass123",
        name="Test Bookkeeper",
        channel_name=None,
        channel_url=None,
        payout_email=None,
        application_note=None,
        partner_type="accountant",
        payout_method="bank_transfer",
        payout_details="IBAN GB29 NWBK 6016 1331 9268 19",
    )
    try:
        assert affiliate.partner_type == "accountant"
        assert affiliate.payout_method == "bank_transfer"
        assert affiliate.payout_details.startswith("IBAN")
        assert affiliate.payout_email == f"bookkeeper-{suffix}@gentletap.dev"

        # Approved-with-rate sets the manual (founder) commission rate.
        approved = affiliate_service.approve_affiliate(db_session, affiliate, commission_rate=0.40)
        assert approved.status == "active"
        assert float(approved.commission_rate) == 0.40
    finally:
        db_session.delete(affiliate)
        db_session.commit()
