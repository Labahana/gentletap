import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import Boolean, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Affiliate(Base):
    __tablename__ = "affiliates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    channel_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    channel_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    payout_email: Mapped[Optional[str]] = mapped_column(String(320), nullable=True)
    payout_method: Mapped[str] = mapped_column(
        String(30), default="paypal", server_default="paypal", nullable=False
    )
    payout_details: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    partner_type: Mapped[str] = mapped_column(
        String(30), default="creator", server_default="creator", nullable=False
    )
    application_note: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    ref_code: Mapped[Optional[str]] = mapped_column(String(64), unique=True, index=True, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    commission_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), default=Decimal("0.30"), nullable=False)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AffiliateRefreshToken(Base):
    __tablename__ = "affiliate_refresh_tokens"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    affiliate_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    family_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AffiliateClick(Base):
    __tablename__ = "affiliate_clicks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    affiliate_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    ref_code: Mapped[str] = mapped_column(String(64), nullable=False)
    landing_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    referrer: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    ip_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    clicked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )


class AffiliateReferral(Base):
    __tablename__ = "affiliate_referrals"
    __table_args__ = (UniqueConstraint("org_id", name="uq_affiliate_referrals_org_id"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    affiliate_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    org_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    ref_code: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="signed_up", nullable=False, index=True)
    signed_up_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    first_paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    churned_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AffiliateCommission(Base):
    __tablename__ = "affiliate_commissions"
    __table_args__ = (UniqueConstraint("paddle_transaction_id", name="uq_affiliate_commissions_paddle_txn"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    affiliate_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    referral_id: Mapped[str] = mapped_column(String(36), nullable=False)
    paddle_transaction_id: Mapped[str] = mapped_column(String(255), nullable=False)
    paddle_subscription_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)
    gross_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    commission_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    payout_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class AffiliatePayout(Base):
    __tablename__ = "affiliate_payouts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    affiliate_id: Mapped[str] = mapped_column(String(36), index=True, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    method: Mapped[str] = mapped_column(String(30), default="paypal", nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
