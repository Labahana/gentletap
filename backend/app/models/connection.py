import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Connection(Base):
    __tablename__ = "connections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(30), nullable=False)  # 'quickbooks' | 'freshbooks'
    token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    realm_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    account_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    refresh_token_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)  # 'active'|'expired'|'disconnected'
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
