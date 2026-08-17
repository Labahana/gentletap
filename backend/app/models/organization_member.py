import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OrganizationMember(Base):
    __tablename__ = "organization_members"
    __table_args__ = (UniqueConstraint("org_id", "user_id", name="uq_org_user"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)  # owner|member
    invited_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)  # active|pending
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
