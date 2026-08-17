import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, TimestampMixin


class Sequence(Base, TimestampMixin):
    __tablename__ = "sequences"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # active|paused|completed
    steps: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)  # list of {day_offset, tone, template_id, enabled}
    stop_after_days: Mapped[Optional[int]] = mapped_column(Integer, default=30, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    auto_assign: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class SequenceAssignment(Base):
    __tablename__ = "sequence_assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sequence_id: Mapped[str] = mapped_column(String(36), ForeignKey("sequences.id"), index=True, nullable=False)
    invoice_id: Mapped[str] = mapped_column(String(36), ForeignKey("invoices.id"), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # 'active'|'paused'|'completed'
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
