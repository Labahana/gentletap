"""Intelligence engine API — preview AI reminder decisions (org-scoped)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.intelligence.context_builder import build_reminder_context
from app.intelligence.engine import engine
from app.intelligence.schemas import Channel
from app.models.invoice import Invoice

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


def _serialize(result) -> dict:
    return {
        "action": result.action.value if result.action else None,
        "channel": result.channel.value if result.channel else None,
        "tone": result.tone.value if result.tone else None,
        "send_at": result.send_at.isoformat() if result.send_at else None,
        "reason": result.reason,
        "message": (
            {"subject": result.message.subject, "body": result.message.body}
            if result.message
            else None
        ),
    }


@router.get("/preview/{invoice_id}")
def intelligence_preview(
    invoice_id: str,
    sequence_step: int = 0,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    """Preview what the intelligence engine would do for one unpaid invoice.

    Never sends anything — returns action/channel/tone/send window and an
    AI-drafted message when generation is enabled.
    """
    _user, org = user_and_org
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.org_id == org.id)
        .first()
    )
    if invoice is None:
        raise HTTPException(status_code=404, detail="Invoice not found")

    ctx = build_reminder_context(db, invoice, org, sequence_step=max(0, min(sequence_step, 4)))
    if ctx is None:
        raise HTTPException(status_code=404, detail="Client not found for invoice")

    result = engine.decide(ctx)

    # Also expose a WhatsApp variant preview when a phone number exists.
    whatsapp_preview = None
    if ctx.client_phone and result.tone is not None:
        from app.intelligence.message_generator import generate_whatsapp_message

        wa_msg = generate_whatsapp_message(ctx, result.tone)
        whatsapp_preview = {"body": wa_msg.body, "template_key": wa_msg.whatsapp_template_key}

    payload = _serialize(result)
    payload["whatsapp"] = whatsapp_preview
    return payload


@router.get("/recommendations")
def intelligence_recommendations(
    limit: int = 25,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    """Decision previews for all open overdue invoices in the org."""
    _user, org = user_and_org
    invoices = (
        db.query(Invoice)
        .filter(Invoice.org_id == org.id, Invoice.balance > 0)
        .order_by(Invoice.due_date.asc())
        .limit(max(1, min(limit, 100)))
        .all()
    )
    items = []
    for inv in invoices:
        ctx = build_reminder_context(db, inv, org)
        if ctx is None:
            continue
        result = engine.decide(ctx, generate_message=False)
        items.append(
            {
                "invoice_id": str(inv.id),
                "number": inv.number,
                "client_name": ctx.client_name,
                "balance": float(inv.balance or 0),
                "days_overdue": ctx.invoice.days_overdue,
                **_serialize(result),
            }
        )
    return {"items": items}
