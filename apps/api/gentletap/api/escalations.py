from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from gentletap.database import Invoice, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.context_builder import build_reminder_context
from gentletap.intelligence.escalation import escalation_recommendation, needs_human

router = APIRouter(prefix="/escalations", tags=["escalations"])


@router.get("")
def list_escalations(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user.id,
            Invoice.balance > 0,
            Invoice.status == "red",
        )
        .order_by(Invoice.days_overdue.desc())
        .limit(50)
        .all()
    )
    items = []
    for inv in invoices:
        ctx = build_reminder_context(db, inv.id, user.id)
        if ctx is None:
            continue
        if needs_human(ctx) or inv.days_overdue >= 21:
            items.append(
                {
                    "invoice_id": str(inv.id),
                    "doc_number": inv.doc_number,
                    "client_name": inv.client.name if inv.client else "",
                    "balance": float(inv.balance),
                    "days_overdue": inv.days_overdue,
                    "recommendation": escalation_recommendation(ctx),
                }
            )
    return {"items": items}
