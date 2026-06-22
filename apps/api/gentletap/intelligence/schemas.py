from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Tone(str, Enum):
    WARM = "warm"
    FRIENDLY = "friendly"
    PROFESSIONAL = "professional"
    FIRM = "firm"
    URGENT = "urgent"


class Channel(str, Enum):
    EMAIL = "email"
    WHATSAPP = "whatsapp"


class Action(str, Enum):
    SEND = "send"
    WAIT = "wait"
    ESCALATE = "escalate"
    SKIP = "skip"


class ClientProfile(BaseModel):
    avg_days_to_pay: float | None = None
    late_payment_rate: float = 0.0
    invoices_paid_on_time: int = 0
    invoices_paid_late: int = 0
    lifetime_value: float = 0.0
    tenure_months: int = 0
    communication_style: str = "unknown"
    risk_level: RiskLevel = RiskLevel.MEDIUM
    preferred_channel: str = "email"


class InvoiceContext(BaseModel):
    invoice_id: str
    doc_number: str
    amount: float
    balance: float
    currency: str = "USD"
    days_overdue: int
    due_date: datetime
    sequence_step: int = 0
    client_responded_recently: bool = False
    dispute_flag: bool = False
    sequence_paused: bool = False
    approved: bool = False
    payment_link: str | None = None


class ReminderContext(BaseModel):
    client_id: str
    client_name: str
    client_email: str | None
    client_phone: str | None = None
    email_suppressed: bool = False
    user_plan: str = "free"
    sender_name: str = "Your freelancer"
    invoice: InvoiceContext
    profile: ClientProfile
    prior_messages_count: int = 0


class GeneratedMessage(BaseModel):
    subject: str = ""
    body: str
    whatsapp_template_key: str | None = None


class DecideResult(BaseModel):
    action: Action
    channel: Channel | None = None
    tone: Tone | None = None
    send_at: datetime | None = None
    message: GeneratedMessage | None = None
    reason: str | None = None


BANNED_PHRASES = (
    "collections",
    "debt collector",
    "demand notice",
    "overdue notice",
    "legal action",
)
