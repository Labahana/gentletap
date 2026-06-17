"""Subscription plan definitions and feature gates (Option B pricing)."""

from typing import Literal

PlanId = Literal["free", "pro", "pro_plus", "team"]

PLAN_RANK: dict[str, int] = {
    "free": 0,
    "pro": 1,
    "pro_plus": 2,
    "team": 3,
}

PAID_PLANS: frozenset[str] = frozenset({"pro", "pro_plus", "team"})


def normalize_plan(plan: str | None) -> PlanId:
    if plan in PLAN_RANK:
        return plan  # type: ignore[return-value]
    return "free"


def is_paid_plan(plan: str | None) -> bool:
    return normalize_plan(plan) in PAID_PLANS


def has_unlimited_sequences(plan: str | None) -> bool:
    return is_paid_plan(plan)


def has_whatsapp(plan: str | None) -> bool:
    return normalize_plan(plan) in {"pro_plus", "team"}


def has_priority_ai(plan: str | None) -> bool:
    return normalize_plan(plan) in {"pro_plus", "team"}


def has_team_seats(plan: str | None) -> bool:
    return normalize_plan(plan) == "team"


def plan_display_name(plan: str | None) -> str:
    names = {
        "free": "Starter",
        "pro": "Pro",
        "pro_plus": "Pro+",
        "team": "Team",
    }
    return names.get(normalize_plan(plan), "Starter")


PLAN_CATALOG: list[dict] = [
    {
        "id": "free",
        "name": "Starter",
        "price_monthly": 0,
        "price_annual": 0,
        "active_sequence_limit": 5,
        "features": [
            "QuickBooks sync",
            "AI reminder previews",
            "Email reminders (Gmail / Resend)",
            "5 active invoice sequences",
        ],
    },
    {
        "id": "pro",
        "name": "Pro",
        "price_monthly": 19,
        "price_annual": 190,
        "active_sequence_limit": None,
        "features": [
            "Unlimited active sequences",
            "Autonomous day 0→21 follow-ups",
            "AI-personalized messages",
            "Send from your Gmail inbox",
        ],
    },
    {
        "id": "pro_plus",
        "name": "Pro+",
        "price_monthly": 39,
        "price_annual": 390,
        "active_sequence_limit": None,
        "features": [
            "Everything in Pro",
            "WhatsApp reminders (Meta-approved templates)",
            "Priority AI (GPT-4o messages)",
            "Escalation dashboard",
        ],
    },
    {
        "id": "team",
        "name": "Team",
        "price_monthly": 59,
        "price_annual": 590,
        "active_sequence_limit": None,
        "features": [
            "Everything in Pro+",
            "3 team seats (shared dashboard)",
            "Priority support",
        ],
    },
]
