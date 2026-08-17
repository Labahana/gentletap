import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OrgSettings(Base):
    __tablename__ = "org_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("organizations.id"), unique=True, index=True, nullable=False
    )
    operation_mode: Mapped[str] = mapped_column(String(20), default="template", nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="America/New_York", nullable=False)
    signature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    branding_logo_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    send_thank_you: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    daily_digest: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    payment_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    escalation_alerts: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    stop_after_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    contact_window_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    email_notifications: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    digest_frequency: Mapped[str] = mapped_column(String(20), default="daily", nullable=False)
    reminder_defaults: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
