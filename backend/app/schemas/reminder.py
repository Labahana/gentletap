from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel


class ReminderScheduleOut(BaseModel):
    id: str
    invoice_id: str
    step_index: int
    scheduled_at: datetime
    tone: str
    template_id: Optional[str] = None
    channel: str
    status: str
    skip_reason: Optional[str] = None
    sent_message_id: Optional[str] = None
    draft_subject: Optional[str] = None
    draft_body: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ReminderScheduleUpdate(BaseModel):
    scheduled_at: Optional[datetime] = None
    tone: Optional[str] = None
    template_id: Optional[str] = None


class ScheduleTimelineOut(BaseModel):
    invoice_id: str
    items: List[ReminderScheduleOut]


class DraftRegenerateOut(BaseModel):
    subject: str
    body: str
    provider: str


class ApprovalQueueItemOut(BaseModel):
    id: str
    invoice_id: str
    step_index: int
    tone: str
    scheduled_at: datetime
    draft_subject: Optional[str] = None
    draft_body: Optional[str] = None
    skip_reason: Optional[str] = None
    created_at: datetime
    invoice_number: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    due_date: Optional[date] = None
    client_name: Optional[str] = None
    client_email: Optional[str] = None

    class Config:
        from_attributes = True


class ApprovalDecisionIn(BaseModel):
    subject: Optional[str] = None
    body: Optional[str] = None
