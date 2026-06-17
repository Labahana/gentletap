"""WhatsApp monthly quota and per-invoice eligibility."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.database import Invoice, Profile, ReminderMessage, WhatsappConnection
from gentletap.integrations.twilio import templates as wa_templates
from gentletap.plans import has_whatsapp, whatsapp_monthly_limit, whatsapp_step_eligible


def _month_start() -> datetime:
    now = datetime.now(UTC)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def count_monthly_whatsapp_sent(db: Session, user_id: UUID) -> int:
    return (
        db.query(func.count(ReminderMessage.id))
        .join(Invoice, ReminderMessage.invoice_id == Invoice.id)
        .filter(
            ReminderMessage.channel == "whatsapp",
            ReminderMessage.status == "sent",
            ReminderMessage.sent_at >= _month_start(),
            Invoice.user_id == user_id,
        )
        .scalar()
        or 0
    )


def get_active_connection(db: Session, user_id: UUID) -> WhatsappConnection | None:
    return (
        db.query(WhatsappConnection)
        .filter(
            WhatsappConnection.user_id == user_id,
            WhatsappConnection.disconnected_at.is_(None),
            WhatsappConnection.status == "active",
        )
        .one_or_none()
    )


def whatsapp_usage_summary(db: Session, user: Profile) -> dict:
    limit = whatsapp_monthly_limit(user.plan)
    used = count_monthly_whatsapp_sent(db, user.id)
    credits = user.whatsapp_message_credits or 0
    plan_remaining = max(0, limit - used)
    return {
        "monthly_limit": limit,
        "monthly_used": used,
        "monthly_remaining": plan_remaining,
        "extra_credits": credits,
        "total_remaining": plan_remaining + credits,
        "cap_reached": limit > 0 and used >= limit and credits <= 0,
    }


def can_consume_whatsapp_quota(db: Session, user: Profile) -> tuple[bool, str | None]:
    if not has_whatsapp(user.plan):
        return False, "plan_not_eligible"
    conn = get_active_connection(db, user.id)
    if conn is None:
        return False, "whatsapp_not_connected"
    if not wa_templates.templates_configured():
        return False, "whatsapp_not_configured"
    if conn.mode == "shared" and not wa_templates.platform_sender_configured():
        return False, "whatsapp_not_configured"
    summary = whatsapp_usage_summary(db, user)
    if summary["total_remaining"] <= 0:
        return False, "monthly_cap_reached"
    return True, None


def consume_whatsapp_quota(db: Session, user: Profile, *, used_before: int | None = None) -> None:
    """Deduct a purchased credit when the monthly plan allowance is already exhausted."""
    limit = whatsapp_monthly_limit(user.plan)
    used = used_before if used_before is not None else count_monthly_whatsapp_sent(db, user.id)
    if used >= limit and user.whatsapp_message_credits > 0:
        user.whatsapp_message_credits -= 1


def should_schedule_whatsapp_for_step(
    db: Session,
    *,
    user: Profile,
    client_phone: str | None,
    sequence_step: int,
) -> tuple[bool, str | None]:
    if not whatsapp_step_eligible(sequence_step):
        return False, "step_not_eligible"
    if not client_phone:
        return False, "no_client_phone"
    ok, reason = can_consume_whatsapp_quota(db, user)
    if not ok:
        return False, reason
    return True, None
