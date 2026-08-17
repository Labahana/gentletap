"""Opt-out / suppression handling."""

from __future__ import annotations

import logging

from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.reminder_schedule import ReminderSchedule
from app.models.suppression import Suppression
from app.services.redis_lock import cache_suppression, redis_lock
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.handle_opt_out.handle_opt_out_task")
def handle_opt_out_task(channel: str, address: str, org_id: str | None = None, source: str = "unsubscribe"):
    address = (address or "").strip().lower()
    if not address:
        return {"status": "error", "reason": "empty_address"}

    lock_key = f"optout:{org_id or 'global'}:{address}"
    with redis_lock(lock_key, ttl_seconds=120) as acquired:
        if not acquired:
            return {"status": "skipped", "reason": "locked"}

        db = SessionLocal()
        try:
            org_ids = []
            if org_id:
                org_ids = [org_id]
            else:
                clients = db.query(Client).filter(Client.email == address).all()
                org_ids = list({c.org_id for c in clients})

            created = 0
            cancelled = 0
            for oid in org_ids:
                existing = (
                    db.query(Suppression)
                    .filter(
                        Suppression.org_id == oid,
                        Suppression.email_or_phone == address,
                        Suppression.channel == channel,
                    )
                    .first()
                )
                if not existing:
                    db.add(
                        Suppression(
                            org_id=oid,
                            email_or_phone=address,
                            channel=channel,
                            source=source,
                        )
                    )
                    created += 1
                    cache_suppression(oid, address)

                # Cancel pending reminders for clients with this email
                client_ids = [
                    c.id for c in db.query(Client).filter(Client.org_id == oid, Client.email == address).all()
                ]
                if client_ids:
                    from app.models.invoice import Invoice

                    inv_ids = [
                        i.id
                        for i in db.query(Invoice)
                        .filter(Invoice.org_id == oid, Invoice.client_id.in_(client_ids))
                        .all()
                    ]
                    if inv_ids:
                        rows = (
                            db.query(ReminderSchedule)
                            .filter(
                                ReminderSchedule.invoice_id.in_(inv_ids),
                                ReminderSchedule.status == "pending",
                            )
                            .all()
                        )
                        for row in rows:
                            row.status = "cancelled"
                            row.skip_reason = "opt_out"
                            cancelled += 1

                db.add(
                    AuditLog(
                        org_id=oid,
                        actor_type="system",
                        action="opt_out",
                        entity_type="suppression",
                        entity_id=None,
                        details={"channel": channel, "address": address, "source": source},
                    )
                )

            db.commit()
            return {"status": "ok", "created": created, "cancelled": cancelled, "orgs": org_ids}
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
