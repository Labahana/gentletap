import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Suppression(Base):
    __tablename__ = "suppressions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    email_or_phone: Mapped[str] = mapped_column(String(320), index=True, nullable=False)
    channel: Mapped[str] = mapped_column(String(20), default="email", nullable=False)
    source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
