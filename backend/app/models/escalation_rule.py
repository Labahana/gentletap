import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EscalationRule(Base):
    __tablename__ = "escalation_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # conditions: {"min_days_overdue": int, "min_reminders_sent": int, "min_amount": float}
    conditions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    # actions: {"notify_email": bool, "pause_reminders": bool, "mark_escalated": bool}
    actions: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
