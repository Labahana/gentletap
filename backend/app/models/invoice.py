import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, TimestampMixin


class Invoice(Base, TimestampMixin):
    __tablename__ = "invoices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    connection_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("connections.id"), nullable=True)
    external_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    number: Mapped[str] = mapped_column(String(64), nullable=False)
    client_id: Mapped[str] = mapped_column(String(36), ForeignKey("clients.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    balance: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    issue_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="unpaid", nullable=False
    )  # unpaid|chasing|paid|closed|disputed
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    first_overdue_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    stop_reminders: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    imported_from: Mapped[str] = mapped_column(String(20), default="manual", nullable=False)  # quickbooks|freshbooks|csv|manual

    client: Mapped["Client"] = relationship("Client", lazy="joined")
