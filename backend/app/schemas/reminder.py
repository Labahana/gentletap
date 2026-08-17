from datetime import datetime
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
