"""Affiliate program — attribution, tracking, commissions."""

from __future__ import annotations

import calendar
import hashlib
import re
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import (
    Affiliate,
    AffiliateClick,
    AffiliateCommission,
    AffiliatePayout,
    AffiliateReferral,
    Profile,
)
from gentletap.services.affiliate_auth import hash_affiliate_password

REF_CODE_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$")


def slugify_ref_code(raw: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", raw.lower()).strip("-")
    if len(slug) < 3:
        slug = f"creator-{uuid.uuid4().hex[:6]}"
    return slug[:32]


def unique_ref_code(db: Session, base: str) -> str:
    candidate = slugify_ref_code(base)
    if not db.query(Affiliate).filter(Affiliate.ref_code == candidate).one_or_none():
        return candidate
    for i in range(2, 100):
        alt = f"{candidate[:28]}-{i}"
        if not db.query(Affiliate).filter(Affiliate.ref_code == alt).one_or_none():
            return alt
    return f"aff-{uuid.uuid4().hex[:8]}"


def get_active_affiliate_by_ref(db: Session, ref_code: str) -> Affiliate | None:
    code = ref_code.strip().lower()
    if not code:
        return None
    return (
        db.query(Affiliate)
        .filter(Affiliate.ref_code == code, Affiliate.status == "active")
        .one_or_none()
    )


def hash_ip(ip: str) -> str:
    salt = get_settings().secret_key[:16]
    return hashlib.sha256(f"{salt}:{ip}".encode()).hexdigest()


def record_click(
    db: Session,
    *,
    ref_code: str,
    landing_path: str | None = None,
    referrer: str | None = None,
    user_agent: str | None = None,
    ip: str | None = None,
) -> bool:
    affiliate = get_active_affiliate_by_ref(db, ref_code)
    if not affiliate:
        return False
    db.add(
        AffiliateClick(
            id=uuid.uuid4(),
            affiliate_id=affiliate.id,
            ref_code=affiliate.ref_code or ref_code.lower(),
            landing_path=(landing_path or "")[:512] or None,
            referrer=(referrer or "")[:1024] or None,
            user_agent=(user_agent or "")[:512] or None,
            ip_hash=hash_ip(ip) if ip else None,
        )
    )
    db.commit()
    return True


def attach_referral_to_user(db: Session, user: Profile, ref_code: str) -> AffiliateReferral | None:
    if user.referred_by_affiliate_id:
        return (
            db.query(AffiliateReferral)
            .filter(AffiliateReferral.user_id == user.id)
            .one_or_none()
        )

    affiliate = get_active_affiliate_by_ref(db, ref_code)
    if not affiliate:
        return None

    existing = db.query(AffiliateReferral).filter(AffiliateReferral.user_id == user.id).one_or_none()
    if existing:
        return existing

    now = datetime.now(UTC)
    referral = AffiliateReferral(
        id=uuid.uuid4(),
        affiliate_id=affiliate.id,
        user_id=user.id,
        ref_code=affiliate.ref_code or ref_code.lower(),
        status="signed_up",
        signed_up_at=now,
    )
    user.referred_by_affiliate_id = affiliate.id
    db.add(referral)
    db.commit()
    db.refresh(referral)
    return referral


def referral_for_user(db: Session, user_id: UUID) -> AffiliateReferral | None:
    return db.query(AffiliateReferral).filter(AffiliateReferral.user_id == user_id).one_or_none()


def affiliate_ref_for_checkout(db: Session, user: Profile) -> tuple[str, str] | None:
    """Return (affiliate_id, ref_code) when user was referred by an active affiliate."""
    if not user.referred_by_affiliate_id:
        return None
    affiliate = (
        db.query(Affiliate)
        .filter(Affiliate.id == user.referred_by_affiliate_id, Affiliate.status == "active")
        .one_or_none()
    )
    if not affiliate or not affiliate.ref_code:
        return None
    return str(affiliate.id), affiliate.ref_code


def mark_referral_active(db: Session, user_id: UUID) -> None:
    referral = referral_for_user(db, user_id)
    if not referral or referral.status == "active":
        if referral and not referral.first_paid_at:
            referral.first_paid_at = datetime.now(UTC)
            referral.status = "active"
            db.commit()
        return
    referral.status = "active"
    referral.first_paid_at = datetime.now(UTC)
    referral.churned_at = None
    db.commit()


def mark_referral_churned(db: Session, user_id: UUID) -> None:
    referral = referral_for_user(db, user_id)
    if not referral or referral.status == "churned":
        return
    referral.status = "churned"
    referral.churned_at = datetime.now(UTC)
    db.commit()


def _decimal_amount(value: str | int | float | Decimal | None) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def paddle_transaction_gross(data: dict) -> tuple[Decimal, str]:
    """Extract paid amount from Paddle Billing transaction payload."""
    details = data.get("details") or {}
    totals = details.get("totals") or {}
    currency = (totals.get("currency_code") or data.get("currency_code") or "USD").upper()
    for key in ("grand_total", "total", "subtotal"):
        raw = totals.get(key)
        if raw is not None:
            amount = _decimal_amount(raw)
            # Paddle amounts are in minor units (cents)
            if amount > 0:
                return (amount / Decimal("100")).quantize(Decimal("0.01")), currency
    return Decimal("0"), currency


def _add_months(dt: datetime, months: int) -> datetime:
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    last_day = calendar.monthrange(year, month)[1]
    day = min(dt.day, last_day)
    return dt.replace(year=year, month=month, day=day)


def commission_ends_at(referral: AffiliateReferral) -> datetime | None:
    if not referral.first_paid_at:
        return None
    months = get_settings().affiliate_commission_months
    if months <= 0:
        return None
    return _add_months(referral.first_paid_at, months)


def referral_commission_eligible(referral: AffiliateReferral, *, at: datetime | None = None) -> bool:
    """True if this referral is still inside the commission window."""
    months = get_settings().affiliate_commission_months
    if months <= 0:
        return False
    if not referral.first_paid_at:
        return True
    end = commission_ends_at(referral)
    if end is None:
        return True
    return (at or datetime.now(UTC)) <= end


def record_subscription_commission(
    db: Session,
    *,
    user: Profile,
    paddle_transaction_id: str,
    paddle_subscription_id: str | None,
    gross_amount: Decimal,
    currency: str,
    event_type: str = "renewal",
) -> AffiliateCommission | None:
    referral = referral_for_user(db, user.id)
    if not referral:
        return None

    affiliate = db.query(Affiliate).filter(Affiliate.id == referral.affiliate_id).one_or_none()
    if not affiliate or affiliate.status != "active":
        return None

    if not referral_commission_eligible(referral):
        return None

    existing = (
        db.query(AffiliateCommission)
        .filter(AffiliateCommission.paddle_transaction_id == paddle_transaction_id)
        .one_or_none()
    )
    if existing:
        return existing

    rate = Decimal(str(affiliate.commission_rate or get_settings().affiliate_default_commission_rate))
    commission = (gross_amount * rate).quantize(Decimal("0.01"))
    if commission <= 0:
        return None

    mark_referral_active(db, user.id)

    row = AffiliateCommission(
        id=uuid.uuid4(),
        affiliate_id=affiliate.id,
        referral_id=referral.id,
        paddle_transaction_id=paddle_transaction_id,
        paddle_subscription_id=paddle_subscription_id,
        event_type=event_type,
        gross_amount=gross_amount,
        commission_amount=commission,
        currency=currency[:3],
        status="pending",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def clawback_commission(db: Session, paddle_transaction_id: str) -> AffiliateCommission | None:
    original = (
        db.query(AffiliateCommission)
        .filter(
            AffiliateCommission.paddle_transaction_id == paddle_transaction_id,
            AffiliateCommission.event_type != "refund",
        )
        .one_or_none()
    )
    if not original or original.status == "clawed_back":
        return None

    refund_id = f"{paddle_transaction_id}:refund"
    if db.query(AffiliateCommission).filter(AffiliateCommission.paddle_transaction_id == refund_id).one_or_none():
        return None

    original.status = "clawed_back"
    clawback = AffiliateCommission(
        id=uuid.uuid4(),
        affiliate_id=original.affiliate_id,
        referral_id=original.referral_id,
        paddle_transaction_id=refund_id,
        paddle_subscription_id=original.paddle_subscription_id,
        event_type="refund",
        gross_amount=-abs(Decimal(str(original.gross_amount))),
        commission_amount=-abs(Decimal(str(original.commission_amount))),
        currency=original.currency,
        status="pending",
    )
    db.add(clawback)
    db.commit()
    return clawback


def create_affiliate_application(
    db: Session,
    *,
    email: str,
    password: str,
    name: str,
    channel_name: str | None,
    channel_url: str | None,
    payout_email: str | None,
    application_note: str | None,
) -> Affiliate:
    normalized = email.lower()
    if db.query(Affiliate).filter(Affiliate.email == normalized).one_or_none():
        raise ValueError("An application already exists for this email")

    base_ref = channel_name or name or normalized.split("@")[0]
    affiliate = Affiliate(
        id=uuid.uuid4(),
        email=normalized,
        password_hash=hash_affiliate_password(password),
        name=name.strip(),
        channel_name=(channel_name or "").strip() or None,
        channel_url=(channel_url or "").strip() or None,
        payout_email=(payout_email or normalized).lower(),
        application_note=(application_note or "").strip() or None,
        ref_code=None,
        status="pending",
        commission_rate=get_settings().affiliate_default_commission_rate,
    )
    db.add(affiliate)
    db.commit()
    db.refresh(affiliate)
    return affiliate


def approve_affiliate(db: Session, affiliate: Affiliate, ref_code: str | None = None) -> Affiliate:
    if affiliate.status == "active":
        return affiliate
    base = ref_code or affiliate.channel_name or affiliate.name or affiliate.email.split("@")[0]
    affiliate.ref_code = unique_ref_code(db, base)
    affiliate.status = "active"
    affiliate.approved_at = datetime.now(UTC)
    db.commit()
    db.refresh(affiliate)
    return affiliate


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if not domain:
        return "***"
    if len(local) <= 1:
        masked_local = "*"
    else:
        masked_local = f"{local[0]}***"
    return f"{masked_local}@{domain}"


def affiliate_dashboard(db: Session, affiliate: Affiliate) -> dict:
    settings = get_settings()
    now = datetime.now(UTC)
    since_30d = now - timedelta(days=30)

    clicks_total = (
        db.query(func.count(AffiliateClick.id))
        .filter(AffiliateClick.affiliate_id == affiliate.id)
        .scalar()
        or 0
    )
    clicks_30d = (
        db.query(func.count(AffiliateClick.id))
        .filter(AffiliateClick.affiliate_id == affiliate.id, AffiliateClick.clicked_at >= since_30d)
        .scalar()
        or 0
    )

    referrals = (
        db.query(AffiliateReferral)
        .filter(AffiliateReferral.affiliate_id == affiliate.id)
        .order_by(AffiliateReferral.signed_up_at.desc())
        .all()
    )
    signups = len(referrals)
    active_subscribers = sum(1 for r in referrals if r.status == "active")
    conversion_rate = round((signups / clicks_total) * 100, 1) if clicks_total else 0.0

    commissions = (
        db.query(AffiliateCommission)
        .filter(AffiliateCommission.affiliate_id == affiliate.id)
        .order_by(AffiliateCommission.created_at.desc())
        .limit(100)
        .all()
    )

    def sum_commissions(statuses: tuple[str, ...]) -> float:
        total = (
            db.query(func.coalesce(func.sum(AffiliateCommission.commission_amount), 0))
            .filter(
                AffiliateCommission.affiliate_id == affiliate.id,
                AffiliateCommission.status.in_(statuses),
            )
            .scalar()
        )
        return float(total or 0)

    pending_earnings = sum_commissions(("pending",))
    approved_earnings = sum_commissions(("approved",))
    paid_earnings = sum_commissions(("paid",))

    user_ids = [r.user_id for r in referrals]
    profiles: dict[UUID, Profile] = {}
    if user_ids:
        for p in db.query(Profile).filter(Profile.id.in_(user_ids)).all():
            profiles[p.id] = p

    referral_rows = []
    for r in referrals:
        profile = profiles.get(r.user_id)
        referral_rows.append(
            {
                "id": str(r.id),
                "status": r.status,
                "signed_up_at": r.signed_up_at.isoformat(),
                "first_paid_at": r.first_paid_at.isoformat() if r.first_paid_at else None,
                "commission_ends_at": (
                    commission_ends_at(r).isoformat() if commission_ends_at(r) else None
                ),
                "commission_eligible": referral_commission_eligible(r),
                "churned_at": r.churned_at.isoformat() if r.churned_at else None,
                "user_email_masked": mask_email(profile.email) if profile else "***",
                "user_plan": profile.plan if profile else "unknown",
            }
        )

    commission_rows = [
        {
            "id": str(c.id),
            "event_type": c.event_type,
            "gross_amount": float(c.gross_amount),
            "commission_amount": float(c.commission_amount),
            "currency": c.currency,
            "status": c.status,
            "created_at": c.created_at.isoformat(),
        }
        for c in commissions
    ]

    payouts = (
        db.query(AffiliatePayout)
        .filter(AffiliatePayout.affiliate_id == affiliate.id)
        .order_by(AffiliatePayout.created_at.desc())
        .limit(20)
        .all()
    )

    web_url = settings.web_url.rstrip("/")
    ref_code = affiliate.ref_code or ""
    commission_months = settings.affiliate_commission_months
    return {
        "affiliate": {
            "id": str(affiliate.id),
            "name": affiliate.name,
            "email": affiliate.email,
            "status": affiliate.status,
            "ref_code": ref_code,
            "commission_rate": float(affiliate.commission_rate),
            "payout_email": affiliate.payout_email,
            "channel_name": affiliate.channel_name,
            "channel_url": affiliate.channel_url,
        },
        "links": {
            "home": f"{web_url}/?ref={ref_code}" if ref_code else None,
            "signup": f"{web_url}/signup?ref={ref_code}" if ref_code else None,
            "pricing": f"{web_url}/#pricing?ref={ref_code}" if ref_code else None,
        },
        "stats": {
            "clicks_total": clicks_total,
            "clicks_30d": clicks_30d,
            "signups": signups,
            "active_subscribers": active_subscribers,
            "conversion_rate": conversion_rate,
            "commission_months": commission_months,
            "pending_earnings": pending_earnings,
            "approved_earnings": approved_earnings,
            "paid_earnings": paid_earnings,
            "lifetime_earnings": pending_earnings + approved_earnings + paid_earnings,
        },
        "referrals": referral_rows,
        "commissions": commission_rows,
        "payouts": [
            {
                "id": str(p.id),
                "amount": float(p.amount),
                "currency": p.currency,
                "status": p.status,
                "method": p.method,
                "reference": p.reference,
                "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                "created_at": p.created_at.isoformat(),
            }
            for p in payouts
        ],
    }


def list_affiliates_admin(db: Session, *, status: str | None = None, limit: int = 50, offset: int = 0) -> dict:
    q = db.query(Affiliate)
    if status:
        q = q.filter(Affiliate.status == status)
    total = q.count()
    rows = q.order_by(Affiliate.created_at.desc()).offset(offset).limit(limit).all()

    items = []
    for a in rows:
        signups = (
            db.query(func.count(AffiliateReferral.id))
            .filter(AffiliateReferral.affiliate_id == a.id)
            .scalar()
            or 0
        )
        active = (
            db.query(func.count(AffiliateReferral.id))
            .filter(AffiliateReferral.affiliate_id == a.id, AffiliateReferral.status == "active")
            .scalar()
            or 0
        )
        earnings = (
            db.query(func.coalesce(func.sum(AffiliateCommission.commission_amount), 0))
            .filter(
                AffiliateCommission.affiliate_id == a.id,
                AffiliateCommission.status.in_(("pending", "approved", "paid")),
            )
            .scalar()
        )
        items.append(
            {
                "id": str(a.id),
                "name": a.name,
                "email": a.email,
                "status": a.status,
                "ref_code": a.ref_code,
                "channel_name": a.channel_name,
                "signups": signups,
                "active_subscribers": active,
                "lifetime_earnings": float(earnings or 0),
                "created_at": a.created_at.isoformat(),
                "approved_at": a.approved_at.isoformat() if a.approved_at else None,
            }
        )
    return {"total": total, "items": items}


def affiliate_detail_admin(db: Session, affiliate_id: UUID) -> dict | None:
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).one_or_none()
    if not affiliate:
        return None
    dash = affiliate_dashboard(db, affiliate)
    dash["affiliate"]["application_note"] = affiliate.application_note
    return dash


def create_payout(
    db: Session,
    affiliate_id: UUID,
    *,
    amount: float,
    method: str = "paypal",
    reference: str | None = None,
    notes: str | None = None,
) -> AffiliatePayout:
    affiliate = db.query(Affiliate).filter(Affiliate.id == affiliate_id).one_or_none()
    if not affiliate:
        raise ValueError("Affiliate not found")

    pending = (
        db.query(AffiliateCommission)
        .filter(
            AffiliateCommission.affiliate_id == affiliate_id,
            AffiliateCommission.status == "pending",
        )
        .order_by(AffiliateCommission.created_at.asc())
        .all()
    )
    payout_amount = Decimal(str(amount))
    if payout_amount <= 0:
        raise ValueError("Payout amount must be positive")

    available = sum(Decimal(str(c.commission_amount)) for c in pending)
    if payout_amount > available:
        raise ValueError("Payout exceeds pending commission balance")

    payout = AffiliatePayout(
        id=uuid.uuid4(),
        affiliate_id=affiliate_id,
        amount=payout_amount,
        currency="USD",
        status="paid",
        method=method,
        reference=reference,
        notes=notes,
        paid_at=datetime.now(UTC),
    )
    db.add(payout)

    remaining = payout_amount
    for commission in pending:
        if remaining <= 0:
            break
        commission.status = "paid"
        commission.payout_id = payout.id
        remaining -= Decimal(str(commission.commission_amount))

    db.commit()
    db.refresh(payout)
    return payout
