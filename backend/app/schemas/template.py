from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TemplateCreate(BaseModel):
    name: str
    tone: str = "friendly"  # 'warm'|'friendly'|'professional'|'firm'|'urgent'
    subject: str
    body: str
    is_default: bool = False


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    tone: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    is_default: Optional[bool] = None


class TemplateOut(BaseModel):
    id: str
    org_id: str
    name: str
    tone: str
    subject: str
    body: str
    is_default: bool
    ai_generated: bool = False
    ai_approved: bool = True
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AIGenerateRequest(BaseModel):
    tone: str = "friendly"
    context: Optional[str] = None
    invoice_number: Optional[str] = None
    amount: Optional[float] = None
    client_name: Optional[str] = None


class AIGenerateResponse(BaseModel):
    subject: str
    body: str
    tone: str
