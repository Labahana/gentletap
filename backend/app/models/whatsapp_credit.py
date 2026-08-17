import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WhatsAppCredit(Base):
    __tablename__ = "whatsapp_credits"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    paddle_transaction_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    credits_added: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    credits_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
