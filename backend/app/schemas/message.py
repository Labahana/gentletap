from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ManualSendRequest(BaseModel):
    invoice_id: str
    template_id: Optional[str] = None
    subject: str
    body: str
    preview: Optional[bool] = False
    send_via: Optional[str] = "resend"  # 'resend' (GentleTap domain) or 'gmail' (Connected Google OAuth account)


class MessageOut(BaseModel):
    id: str
    org_id: str
    invoice_id: str
    client_id: str
    template_id: Optional[str] = None
    channel: str
    subject: str
    body: str
    status: str
    provider_message_id: Optional[str] = None
    ai_provider_used: Optional[str] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    created_at: datetime
    client_name: Optional[str] = None
    invoice_number: Optional[str] = None

    class Config:
        from_attributes = True
