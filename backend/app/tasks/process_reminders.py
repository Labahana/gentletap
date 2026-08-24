"""Process due reminder schedule rows with Redis locks and guardrails."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func

from app.config import get_settings
from app.database import SessionLocal
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.message import Message
from app.models.org_settings import OrgSettings
from app.models.reminder_schedule import ReminderSchedule
from app.models.suppression import Suppression
from app.services.redis_lock import redis_lock
from app.services.reminder_engine import (
    get_or_create_org_settings,
    is_within_contact_window,
    next_valid_send_time,
)
from app.services.client_profile import get_or_create_profile
from app.tasks.draft_message import draft_reminder_content
from app.tasks.send_email import create_and_send_message
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


def _is_suppressed(db, org_id: str, email: str) -> bool:
    if not email:
        return True
    row = (
        db.query(Suppression)
        .filter(
            Suppression.org_id == org_id,
            Suppression.email_or_phone == email.lower(),
            Suppression.channel == "email",
        )
        .first()
    )
    return row is not None


def _org_daily_send_count(db, org_id: str) -> int:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        db.query(Message)
        .filter(Message.org_id == org_id, Message.created_at >= start, Message.status != "failed")
        .count()
    )


def _client_sent_in_last_24h(db, client_id: str) -> bool:
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    return (
        db.query(Message)
        .filter(Message.client_id == client_id, Message.created_at >= since, Message.status != "failed")
        .count()
        > 0
    )


def _notify_escalation(db, invoice, ctx) -> None:
    """Record an escalation decision and notify the org owner (human handoff)."""
    try:
        from app.models.audit_log import AuditLog
        from app.models.notification import UserNotification
        from app.models.organization import Organization

        db.add(
            AuditLog(
                org_id=invoice.org_id,
                actor_type="system",
                action="reminder_escalated",
                entity_type="invoice",
                entity_id=invoice.id,
                details={
                    "client": ctx.client_name,
                    "days_overdue": ctx.invoice.days_overdue,
                    "risk": score_risk(ctx).value,
                },
            )
        )
        owner = (
            db.query(Organization).filter(Organization.id == invoice.org_id).first()
        )
        if owner is not None:
            db.add(
                UserNotification(
                    org_id=owner.id,
                    user_id=owner.owner_user_id,
                    type="escalation",
                    title=f"Human handoff recommended — invoice #{invoice.number}",
                    body=(
                        f"{ctx.client_name}: {ctx.invoice.days_overdue} days overdue, "
                        f"high relationship risk. GentleTap paused this reminder for you to handle personally."
                    ),
                )
            )
        db.commit()
    except Exception as exc:  # noqa: BLE001 - notification must never break the pipeline
        db.rollback()
        logger.warning("Escalation notification failed: %s", exc)


def process_single_reminder(db, schedule: ReminderSchedule) -> dict:
    lock_key = f"reminder:{schedule.invoice_id}:{schedule.step_index}"
    with redis_lock(lock_key, ttl_seconds=300) as acquired:
        if not acquired:
            return {"status": "skipped", "reason": "locked"}

        # Re-fetch for freshness
        schedule = db.query(ReminderSchedule).filter(ReminderSchedule.id == schedule.id).first()
        if not schedule or schedule.status != "pending":
            return {"status": "skipped", "reason": "not_pending"}

        invoice = db.query(Invoice).filter(Invoice.id == schedule.invoice_id).first()
        if not invoice:
            schedule.status = "failed"
            schedule.skip_reason = "invoice_missing"
            return {"status": "failed", "reason": "invoice_missing"}

        if invoice.stop_reminders or invoice.status in ("paid", "closed", "disputed") or float(invoice.balance or 0) <= 0:
            schedule.status = "cancelled"
            schedule.skip_reason = "invoice_paid_or_stopped"
            return {"status": "cancelled", "reason": "invoice_paid_or_stopped"}

        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        email = (client.email or "").lower() if client else ""
        if _is_suppressed(db, invoice.org_id, email):
            schedule.status = "skipped"
            schedule.skip_reason = "suppressed"
            return {"status": "skipped", "reason": "suppressed"}

        org_settings = get_or_create_org_settings(db, invoice.org_id)
        now = datetime.now(timezone.utc)
        profile = get_or_create_profile(db, invoice.client_id, invoice.org_id)
        prefs = profile.preferences or {}
        best_hour = None
        if prefs.get("best_send_time"):
            try:
                best_hour = int(str(prefs["best_send_time"]).split(":")[0])
            except (ValueError, TypeError):
                best_hour = 9

        if org_settings.contact_window_enabled and not is_within_contact_window(
            now, tz_name=org_settings.timezone, enabled=True
        ):
            schedule.scheduled_at = next_valid_send_time(
                now, tz_name=org_settings.timezone, best_send_hour=best_hour or 9, enabled=True
            )
            return {"status": "rescheduled", "scheduled_at": schedule.scheduled_at.isoformat()}

        if _org_daily_send_count(db, invoice.org_id) >= settings.org_daily_email_cap:
            schedule.scheduled_at = now + timedelta(hours=1)
            return {"status": "rescheduled", "reason": "org_cap"}

        if _client_sent_in_last_24h(db, invoice.client_id):
            schedule.scheduled_at = now + timedelta(hours=24)
            return {"status": "rescheduled", "reason": "client_24h_cap"}

        # --- Intelligence gate: engine decides send / wait / escalate ---
        try:
            from app.models.organization import Organization
            from app.intelligence.context_builder import build_reminder_context
            from app.intelligence.engine import engine as intel_engine
            from app.intelligence.escalation import should_escalate
            from app.intelligence.risk_scorer import score_risk
            from app.intelligence.timing_optimizer import next_send_window
            from app.intelligence.tone_selector import select_tone

            org_row = (
                db.query(Organization).filter(Organization.id == invoice.org_id).first()
            )
            ctx = (
                build_reminder_context(
                    db, invoice, org_row, sequence_step=schedule.step_index
                )
                if org_row
                else None
            )
            if ctx is not None:
                should_send, reason = intel_engine.should_send(ctx)
                if not should_send:
                    if reason == "client_responded":
                        # Give the thread air — retry after a day.
                        schedule.scheduled_at = now + timedelta(hours=24)
                        schedule.skip_reason = "intel_client_responded"
                        db.commit()
                        return {"status": "rescheduled", "reason": "intel_client_responded"}
                    schedule.status = "skipped"
                    schedule.skip_reason = f"intel_{reason or 'wait'}"
                    return {"status": "skipped", "reason": f"intel_{reason}"}

                if should_escalate(ctx):
                    schedule.status = "skipped"
                    schedule.skip_reason = "intel_human_handoff_recommended"
                    _notify_escalation(db, invoice, ctx)
                    return {"status": "skipped", "reason": "intel_escalated"}

                # Risk-aware tone override when drafting fresh (no fixed template).
                if not schedule.template_id and not schedule.draft_body:
                    risk = score_risk(ctx)
                    schedule.tone = select_tone(ctx, risk).value

                # Timing optimizer: follow-ups (step 1+) defer to the next
                # business-hours weekday window (step 0 always fires now).
                # The contact-window check above covers hours; this adds
                # weekends and nudges early-morning sends to 08:00 local.
                if ctx.invoice.sequence_step >= 1:
                    optimal = next_send_window(ctx, now=now)
                    if optimal > now + timedelta(minutes=30):
                        schedule.scheduled_at = optimal
                        return {
                            "status": "rescheduled",
                            "reason": "intel_send_window",
                            "scheduled_at": optimal.isoformat(),
                        }
        except Exception as exc:  # noqa: BLE001 - intelligence must never block sending
            logger.warning("Intelligence gate skipped (%s); proceeding with default flow", exc)

        if not schedule.draft_body:
            draft = draft_reminder_content(db, schedule)
            schedule.draft_subject = draft["subject"]
            schedule.draft_body = draft["body"]
            provider = draft.get("provider")
            template_id = draft.get("template_id")
        else:
            provider = "template"
            template_id = schedule.template_id
            draft = {"subject": schedule.draft_subject, "body": schedule.draft_body}

        msg = create_and_send_message(
            db,
            org_id=invoice.org_id,
            invoice_id=invoice.id,
            client_id=invoice.client_id,
            subject=draft["subject"],
            body=draft["body"],
            template_id=template_id,
            ai_provider_used=provider,
        )
        schedule.status = "sent"
        schedule.sent_message_id = msg.id
        if invoice.status == "unpaid":
            invoice.status = "chasing"

        # Queue WhatsApp follow-up 3h later for early steps on Pro+/Team
        try:
            from app.models.organization import Organization
            from app.services.plan_gating import can_send_whatsapp
            from app.tasks.process_reminders import send_whatsapp_followup_task

            org = db.query(Organization).filter(Organization.id == invoice.org_id).first()
            profile = get_or_create_profile(db, invoice.client_id, invoice.org_id)
            prefs = profile.preferences or {}
            channel_pref = prefs.get("channel_pref", "email_whatsapp")
            if (
                org
                and schedule.step_index <= 2
                and channel_pref in ("email_whatsapp", "whatsapp_only")
                and can_send_whatsapp(org, db)
            ):
                send_whatsapp_followup_task.apply_async(
                    args=[invoice.id, schedule.step_index, msg.id],
                    countdown=3 * 3600,
                )
        except Exception as exc:
            logger.warning("WhatsApp enqueue skipped: %s", exc)

        return {"status": "sent", "message_id": msg.id, "schedule_id": schedule.id}


@celery_app.task(name="app.tasks.process_reminders.send_whatsapp_followup_task")
def send_whatsapp_followup_task(invoice_id: str, step_index: int, email_message_id: str):
    db = SessionLocal()
    try:
        from app.models.organization import Organization
        from app.models.audit_log import AuditLog
        from app.services.plan_gating import consume_whatsapp_quota, can_send_whatsapp
        from app.services.whatsapp import render_whatsapp_body, send_whatsapp
        from app.services.payment_detect import detect_and_stop_if_paid

        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice or invoice.stop_reminders or float(invoice.balance or 0) <= 0:
            return {"status": "skipped", "reason": "paid_or_missing"}
        detect_and_stop_if_paid(db, invoice, method="pre_whatsapp")
        if invoice.status == "paid":
            db.commit()
            return {"status": "skipped", "reason": "paid"}

        org = db.query(Organization).filter(Organization.id == invoice.org_id).first()
        client = db.query(Client).filter(Client.id == invoice.client_id).first()
        if not org or not client or not client.phone:
            return {"status": "skipped", "reason": "no_phone"}
        if not can_send_whatsapp(org, db):
            db.add(
                AuditLog(
                    org_id=org.id,
                    actor_type="system",
                    action="whatsapp_skipped",
                    entity_type="invoice",
                    entity_id=invoice.id,
                    details={"reason": "quota_exceeded"},
                )
            )
            db.commit()
            return {"status": "skipped", "reason": "quota"}

        if not consume_whatsapp_quota(db, org):
            return {"status": "skipped", "reason": "quota"}

        body = render_whatsapp_body(
            step_index,
            name=(client.name or "there").split()[0],
            number=invoice.number,
            amount=f"{float(invoice.amount):,.2f} {invoice.currency}",
            link="your payment link",
        )
        result = send_whatsapp(client.phone, body)
        wa_msg = Message(
            org_id=org.id,
            invoice_id=invoice.id,
            client_id=client.id,
            channel="whatsapp",
            subject=f"WhatsApp reminder #{invoice.number}",
            body=body,
            status="sent" if result.get("status") != "failed" else "failed",
            provider_message_id=result.get("sid"),
            sent_at=datetime.now(timezone.utc),
            ai_provider_used="template",
        )
        db.add(wa_msg)
        db.add(
            AuditLog(
                org_id=org.id,
                actor_type="system",
                action="whatsapp_send",
                entity_type="message",
                entity_id=None,
                details={"invoice_id": invoice.id, "sid": result.get("sid")},
            )
        )
        db.commit()
        return {"status": "sent", "sid": result.get("sid")}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.process_reminders.process_reminders_task")
def process_reminders_task():
    db = SessionLocal()
    results = []
    try:
        now = datetime.now(timezone.utc)
        due = (
            db.query(ReminderSchedule)
            .filter(ReminderSchedule.status == "pending", ReminderSchedule.scheduled_at <= now)
            .order_by(ReminderSchedule.scheduled_at.asc())
            .limit(200)
            .all()
        )
        for schedule in due:
            try:
                result = process_single_reminder(db, schedule)
                results.append(result)
                db.commit()
            except Exception as exc:
                db.rollback()
                logger.exception("Failed processing schedule %s: %s", schedule.id, exc)
                try:
                    s = db.query(ReminderSchedule).filter(ReminderSchedule.id == schedule.id).first()
                    if s and s.status == "pending":
                        s.status = "failed"
                        s.skip_reason = str(exc)[:240]
                        db.commit()
                except Exception:
                    db.rollback()
                results.append({"status": "failed", "error": str(exc)})
        return {"processed": len(results), "results": results}
    finally:
        db.close()
