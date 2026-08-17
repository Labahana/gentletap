from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class PayoutOut(BaseModel):
    id: str
    org_id: str
    invoice_id: str
    amount: float
    currency: str
    paid_at: datetime
    method: str
    created_at: datetime
    invoice_number: Optional[str] = None
    client_name: Optional[str] = None

    class Config:
        from_attributes = True


class PayoutSummaryOut(BaseModel):
    total_collected: float
    paid_invoices_count: int
    currency: str = "USD"
