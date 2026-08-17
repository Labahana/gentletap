from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class DashboardActivity(BaseModel):
    id: str
    type: str  # send | payment | open
    title: str
    subtitle: str
    amount: Optional[float] = None
    timestamp: datetime


class DashboardSummaryOut(BaseModel):
    total_outstanding: float
    total_invoices_count: int
    at_risk_count: int
    recent_sends_count: int
    expected_collections_7d: float = 0.0
    active_campaigns_count: int = 0
    recent_payments_count: int = 0
    recent_activities: List[DashboardActivity]


class ChartDataPoint(BaseModel):
    date: str
    collected: float
    outstanding: float


class RecoveryByClientPoint(BaseModel):
    client_name: str
    recovery_rate: float
    collected: float


class DashboardChartsOut(BaseModel):
    range: str
    points: List[ChartDataPoint]
    recovery_by_client: List[RecoveryByClientPoint] = []


class EscalationItem(BaseModel):
    invoice_id: str
    invoice_number: str
    client_id: str
    client_name: str
    amount: float
    days_overdue: int
    reminders_sent: int
    last_sent_at: Optional[datetime] = None
    last_response: Optional[str] = None
    recommended_action: str


class RecentPaymentItem(BaseModel):
    invoice_id: str
    invoice_number: str
    client_name: str
    amount: float
    paid_at: datetime
    method: Optional[str] = None
