import uuid
from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base, TimestampMixin


class Template(Base, TimestampMixin):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id: Mapped[str] = mapped_column(String(36), ForeignKey("organizations.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tone: Mapped[str] = mapped_column(String(20), default="friendly", nullable=False)  # 'warm'|'friendly'|'professional'|'firm'|'urgent'
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    ai_approved: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
