from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.payout import Payout
from app.models.invoice import Invoice
from app.models.client import Client
from app.schemas.payout import PayoutOut, PayoutSummaryOut

router = APIRouter(prefix="/payouts", tags=["Payouts"])


@router.get("", response_model=List[PayoutOut])
def list_payouts(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    query = db.query(Payout, Invoice.number.label("invoice_number"), Client.name.label("client_name"))\
        .join(Invoice, Payout.invoice_id == Invoice.id)\
        .join(Client, Invoice.client_id == Client.id)\
        .filter(Payout.org_id == org.id)\
        .order_by(Payout.paid_at.desc())

    offset = (page - 1) * page_size
    results = query.offset(offset).limit(page_size).all()

    output = []
    for payout, inv_num, c_name in results:
        p_dict = PayoutOut.model_validate(payout)
        p_dict.invoice_number = inv_num
        p_dict.client_name = c_name
        output.append(p_dict)

    return output


@router.get("/summary", response_model=PayoutSummaryOut)
def get_payout_summary(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    total = db.query(func.coalesce(func.sum(Payout.amount), 0.0)).filter(Payout.org_id == org.id).scalar()
    count = db.query(Payout).filter(Payout.org_id == org.id).count()

    return PayoutSummaryOut(
        total_collected=float(total),
        paid_invoices_count=count,
        currency="USD",
    )
