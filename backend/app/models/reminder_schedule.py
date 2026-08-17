import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReminderSchedule(Base):
    __tablename__ = "reminder_schedule"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), index=True, nullable=False)
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    step_index: Mapped[int] = mapped_column(Integer, nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    tone: Mapped[str] = mapped_column(String(20), nullable=False)
    template_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("templates.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(20), default="email", nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="pending", nullable=False
    )  # pending|sent|skipped|cancelled|failed
    skip_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sent_message_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("messages.id"), nullable=True)
    draft_subject: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    draft_body: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
