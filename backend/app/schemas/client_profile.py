from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ClientPreferencesUpdate(BaseModel):
    channel_pref: Optional[str] = None
    tone_pref: Optional[str] = None
    best_send_time: Optional[str] = None


class ClientProfileOut(BaseModel):
    id: str
    client_id: str
    avg_days_to_pay: float
    reliability_score: int
    late_count: int
    dispute_count: int
    total_invoices: int
    total_paid: int
    history: Optional[List[Dict[str, Any]]] = None
    preferences: Optional[Dict[str, Any]] = None
    last_updated: datetime

    class Config:
        from_attributes = True
