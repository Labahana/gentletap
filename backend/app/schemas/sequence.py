from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class SequenceStep(BaseModel):
    day_offset: int
    tone: str = "friendly"
    template_id: Optional[str] = None
    enabled: bool = True


class SequenceCreate(BaseModel):
    name: str
    steps: List[SequenceStep]
    stop_after_days: Optional[int] = 30


class SequenceUpdate(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    steps: Optional[List[SequenceStep]] = None
    stop_after_days: Optional[int] = None


class SequenceOut(BaseModel):
    id: str
    org_id: str
    name: str
    status: str
    steps: List[SequenceStep]
    stop_after_days: Optional[int] = None
    is_default: bool = False
    auto_assign: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SequenceAssignRequest(BaseModel):
    invoice_id: str


class SequenceAssignmentOut(BaseModel):
    id: str
    sequence_id: str
    invoice_id: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
