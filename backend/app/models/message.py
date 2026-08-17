import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), index=True, nullable=False)
    client_id: Mapped[str] = mapped_column(String(36), ForeignKey("clients.id"), index=True, nullable=False)
    template_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("templates.id"), nullable=True)
    channel: Mapped[str] = mapped_column(String(20), default="email", nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), default="queued", nullable=False
    )  # queued|sent|delivered|opened|clicked|failed|bounced
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ai_provider_used: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # kimi|zai|template
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
