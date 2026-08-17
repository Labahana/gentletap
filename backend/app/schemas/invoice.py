from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel
from app.schemas.client import ClientOut


class InvoiceCreate(BaseModel):
    number: str
    client_id: str
    amount: float
    currency: str = "USD"
    due_date: Optional[date] = None
    issue_date: Optional[date] = None


class InvoiceUpdate(BaseModel):
    number: Optional[str] = None
    amount: Optional[float] = None
    balance: Optional[float] = None
    currency: Optional[str] = None
    due_date: Optional[date] = None
    issue_date: Optional[date] = None
    status: Optional[str] = None


class InvoiceOut(BaseModel):
    id: str
    org_id: str
    connection_id: Optional[str] = None
    external_id: Optional[str] = None
    number: str
    client_id: str
    amount: float
    balance: float
    currency: str
    due_date: Optional[date] = None
    issue_date: Optional[date] = None
    status: str
    paid_at: Optional[datetime] = None
    first_overdue_at: Optional[datetime] = None
    stop_reminders: bool
    imported_from: str
    created_at: datetime
    updated_at: datetime
    client: Optional[ClientOut] = None

    class Config:
        from_attributes = True


class CSVPreviewRow(BaseModel):
    invoice_number: str
    client_name: str
    client_email: Optional[str] = None
    amount: float
    currency: str = "USD"
    due_date: Optional[str] = None
    issue_date: Optional[str] = None
    is_valid: bool = True
    error_message: Optional[str] = None


class CSVImportPreviewResponse(BaseModel):
    total_rows: int
    valid_rows_count: int
    invalid_rows_count: int
    preview: List[CSVPreviewRow]


class CSVConfirmImportRequest(BaseModel):
    rows: List[CSVPreviewRow]
