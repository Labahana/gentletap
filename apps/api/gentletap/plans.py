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

# WhatsApp: steps 1–3 per invoice; step 0 and 4 are email-only.
WHATSAPP_MAX_SEQUENCE_STEP = 3

WHATSAPP_MONTHLY_LIMITS: dict[str, int] = {
    "pro_plus": 450,
    "team": 850,
}

WHATSAPP_MESSAGE_PACKS: dict[str, int] = {
    "pack_250": 250,
    "pack_500": 500,
}


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


def whatsapp_monthly_limit(plan: str | None) -> int:
    return WHATSAPP_MONTHLY_LIMITS.get(normalize_plan(plan), 0)


def whatsapp_step_eligible(sequence_step: int) -> bool:
    return 1 <= sequence_step <= WHATSAPP_MAX_SEQUENCE_STEP


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


# Keep feature lists in sync with apps/web/src/lib/pricing.ts
PLAN_CATALOG: list[dict] = [
    {
        "id": "free",
        "name": "Starter",
        "price_monthly": 0,
        "price_annual": 0,
        "active_sequence_limit": None,
        "monthly_collection_limit": 5,
        "value_note": "No credit card required to start",
        "features": [
            "QuickBooks Online sync (read-only)",
            "CSV & Excel invoice upload",
            "Connect Gmail for sending",
            "AI-drafted payment reminder emails",
            "Preview & edit messages before they send",
            "Multi-step email sequences (due date → day 21)",
            "Pause reminders per invoice anytime",
            "Auto-stop when QuickBooks shows paid",
            "Invoice & client dashboard",
            "5 invoice collections per month",
        ],
    },
    {
        "id": "pro",
        "name": "Pro",
        "price_monthly": 19,
        "price_annual": 190,
        "active_sequence_limit": None,
        "value_note": "Unlimited collections — one recovered invoice pays for years",
        "features": [
            "Everything in Starter",
            "Unlimited invoice collections",
            "Autonomous follow-ups (go live on autopilot)",
            "AI-personalized emails per client & invoice",
            "Sequences from due date through day 21",
            "Send from your Gmail inbox",
            "QuickBooks sync + spreadsheet re-upload",
            "Edit upcoming reminders from dashboard",
            "Per-invoice reminder history",
            "Payment-received email notifications",
            "Overdue alerts & dashboard summary",
            "Analytics — collections & month-over-month",
        ],
    },
    {
        "id": "pro_plus",
        "name": "Pro+",
        "price_monthly": 39,
        "price_annual": 390,
        "active_sequence_limit": None,
        "value_note": "450 WhatsApp messages/mo included",
        "features": [
            "Everything in Pro",
            "WhatsApp on sequence steps 1–3",
            "450 WhatsApp reminders per month",
            "Email first, WhatsApp hours later",
            "Priority AI (GPT-4o) for sharper copy",
            "Escalation dashboard & recommendations",
            "WhatsApp credit packs (add-on)",
            "Multi-currency invoice support",
        ],
    },
    {
        "id": "team",
        "name": "Team",
        "price_monthly": 59,
        "price_annual": 590,
        "active_sequence_limit": None,
        "value_note": "3 seats · 850 WhatsApp/mo",
        "features": [
            "Everything in Pro+",
            "850 WhatsApp reminders per month",
            "3 team seats",
            "Shared invoice & client dashboard",
            "Priority email support",
            "All Pro+ automation for the whole studio",
        ],
    },
]
