import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WhatsappInboundMessage(Base):
    """Inbound WhatsApp reply log (Twilio webhook)."""

    __tablename__ = "whatsapp_inbound_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id"), index=True, nullable=False
    )
    client_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("clients.id"), index=True, nullable=True
    )
    from_number: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    profile_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    message_sid: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    opt_out: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
