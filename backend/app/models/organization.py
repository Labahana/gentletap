import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    # starter | pro | pro_plus | team  (legacy 'free' treated as starter)
    plan: Mapped[str] = mapped_column(String(20), default="starter", nullable=False)
    billing_period: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # monthly|annual
    seats_limit: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    paddle_customer_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    paddle_subscription_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    whatsapp_quota: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    whatsapp_used_this_period: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    collections_used_this_period: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    collections_quota: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    deletion_requested_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    # Affiliate attribution (set at signup via ?ref= link)
    referred_by_affiliate_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
