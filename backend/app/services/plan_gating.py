"""Server-side plan feature gating."""

from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.organization_member import OrganizationMember
from app.models.whatsapp_credit import WhatsAppCredit

PLAN_QUOTAS = {
    "starter": {"collections": 5, "whatsapp": 0, "seats": 1},
    "free": {"collections": 5, "whatsapp": 0, "seats": 1},  # legacy alias
    "pro": {"collections": None, "whatsapp": 0, "seats": 1},
    "pro_plus": {"collections": None, "whatsapp": 450, "seats": 1},
    "team": {"collections": None, "whatsapp": 850, "seats": 3},
}

PLAN_PRICES = {
    "starter": {"monthly": 0, "annual": 0, "label": "Starter"},
    "pro": {"monthly": 19, "annual": 16, "label": "Pro"},
    "pro_plus": {"monthly": 39, "annual": 33, "label": "Pro+"},
    "team": {"monthly": 59, "annual": 49, "label": "Team"},
}


def normalize_plan(plan: Optional[str]) -> str:
    p = (plan or "starter").lower()
    if p == "free":
        return "starter"
    return p if p in PLAN_QUOTAS else "starter"


def apply_plan_quotas(org: Organization) -> None:
    plan = normalize_plan(org.plan)
    quotas = PLAN_QUOTAS[plan]
    org.plan = plan
    org.seats_limit = quotas["seats"]
    org.whatsapp_quota = quotas["whatsapp"] or 0
    org.collections_quota = quotas["collections"] if quotas["collections"] is not None else 999999


def can_use_autopilot(org: Organization) -> bool:
    return normalize_plan(org.plan) in ("pro", "pro_plus", "team")


def can_send_whatsapp(org: Organization, db: Optional[Session] = None) -> bool:
    plan = normalize_plan(org.plan)
    if plan not in ("pro_plus", "team"):
        return False
    used = org.whatsapp_used_this_period or 0
    quota = org.whatsapp_quota or 0
    if used < quota:
        return True
    if db is None:
        return False
    return available_whatsapp_credits(db, org.id) > 0


def available_whatsapp_credits(db: Session, org_id: str) -> int:
    rows = (
        db.query(WhatsAppCredit)
        .filter(WhatsAppCredit.org_id == org_id, WhatsAppCredit.status == "active")
        .all()
    )
    return sum(max(0, r.credits_added - r.credits_used) for r in rows)


def consume_whatsapp_quota(db: Session, org: Organization) -> bool:
    """Deduct one WhatsApp send from monthly quota or credit packs. Returns False if blocked."""
    if normalize_plan(org.plan) not in ("pro_plus", "team"):
        return False
    if org.whatsapp_used_this_period < org.whatsapp_quota:
        org.whatsapp_used_this_period += 1
        return True
    rows = (
        db.query(WhatsAppCredit)
        .filter(WhatsAppCredit.org_id == org.id, WhatsAppCredit.status == "active")
        .order_by(WhatsAppCredit.created_at.asc())
        .all()
    )
    for row in rows:
        if row.credits_used < row.credits_added:
            row.credits_used += 1
            return True
    return False


def can_add_team_member(org: Organization, db: Session) -> bool:
    if normalize_plan(org.plan) != "team":
        return False
    count = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.org_id == org.id,
            OrganizationMember.status.in_(["active", "pending"]),
        )
        .count()
    )
    return count < org.seats_limit


def can_use_priority_ai(org: Organization) -> bool:
    return normalize_plan(org.plan) in ("pro_plus", "team")


def can_use_multi_currency(org: Organization) -> bool:
    return normalize_plan(org.plan) in ("pro_plus", "team")


def can_send_collection(org: Organization) -> bool:
    """Starter: max 5 collections/month. Paid: unlimited."""
    plan = normalize_plan(org.plan)
    if plan == "starter":
        used = org.collections_used_this_period or 0
        quota = org.collections_quota or 5
        return used < quota
    return True


def require_feature(org: Organization, feature: str, db: Optional[Session] = None) -> None:
    """Raise 403 if org cannot use feature."""
    checks = {
        "autopilot": (can_use_autopilot(org), "Upgrade to Pro to unlock Autopilot."),
        "whatsapp": (
            can_send_whatsapp(org, db),
            "Upgrade to Pro+ to unlock WhatsApp.",
        ),
        "team": (
            normalize_plan(org.plan) == "team",
            "Upgrade to Team to invite members.",
        ),
        "priority_ai": (can_use_priority_ai(org), "Upgrade to Pro+ for priority AI."),
        "multi_currency": (can_use_multi_currency(org), "Upgrade to Pro+ for multi-currency."),
        "collection": (
            can_send_collection(org),
            "Starter plan limit of 5 collections this month. Upgrade to continue.",
        ),
    }
    ok, detail = checks.get(feature, (True, ""))
    if not ok:
        raise HTTPException(status_code=403, detail=detail)


def require_owner(user, org: Organization) -> None:
    if user.id != org.owner_user_id:
        raise HTTPException(status_code=403, detail="Only the organization owner can perform this action.")
