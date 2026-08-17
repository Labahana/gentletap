import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ClientProfile(Base):
    __tablename__ = "client_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("clients.id"), unique=True, index=True, nullable=False
    )
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    avg_days_to_pay: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    reliability_score: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    late_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    dispute_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_invoices: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_paid: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    history: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    preferences: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
