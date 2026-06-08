from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.database import Invoice, get_db
from gentletap.dependencies import CurrentUser

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("/summary")
def invoices_summary(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    unpaid_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .scalar()
        or 0
    )
    overdue_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.days_overdue > 0)
        .scalar()
        or 0
    )
    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .scalar()
        or 0
    )
    currency_row = (
        db.query(Invoice.currency)
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .first()
    )

    return {
        "unpaid_count": unpaid_count,
        "overdue_count": overdue_count,
        "total_outstanding": float(total_outstanding),
        "currency": currency_row[0] if currency_row else "USD",
    }
