"""Affiliate program — creators, tracking, referrals, commissions.

Revision ID: 020
Revises: 019
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "020"
down_revision: Union[str, None] = "019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "affiliates",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("channel_name", sa.String(255), nullable=True),
        sa.Column("channel_url", sa.String(512), nullable=True),
        sa.Column("payout_email", sa.String(320), nullable=True),
        sa.Column("application_note", sa.Text, nullable=True),
        sa.Column("ref_code", sa.String(64), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("commission_rate", sa.Numeric(5, 4), server_default="0.3000", nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_affiliates_email", "affiliates", ["email"], unique=True)
    op.create_index("ix_affiliates_ref_code", "affiliates", ["ref_code"], unique=True)
    op.create_index("ix_affiliates_status", "affiliates", ["status"])

    op.create_table(
        "affiliate_refresh_tokens",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("affiliate_id", UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("family_id", UUID(as_uuid=True), nullable=False),
        sa.Column("used", sa.Boolean, server_default="false", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_affiliate_refresh_tokens_affiliate_id", "affiliate_refresh_tokens", ["affiliate_id"])
    op.create_index("ix_affiliate_refresh_tokens_token_hash", "affiliate_refresh_tokens", ["token_hash"], unique=True)

    op.create_table(
        "affiliate_clicks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("affiliate_id", UUID(as_uuid=True), nullable=False),
        sa.Column("ref_code", sa.String(64), nullable=False),
        sa.Column("landing_path", sa.String(512), nullable=True),
        sa.Column("referrer", sa.String(1024), nullable=True),
        sa.Column("user_agent", sa.String(512), nullable=True),
        sa.Column("ip_hash", sa.String(64), nullable=True),
        sa.Column(
            "clicked_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_affiliate_clicks_affiliate_id", "affiliate_clicks", ["affiliate_id"])
    op.create_index("ix_affiliate_clicks_clicked_at", "affiliate_clicks", ["clicked_at"])

    op.add_column(
        "profiles",
        sa.Column("referred_by_affiliate_id", UUID(as_uuid=True), nullable=True),
    )
    op.create_index("ix_profiles_referred_by_affiliate_id", "profiles", ["referred_by_affiliate_id"])

    op.create_table(
        "affiliate_referrals",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("affiliate_id", UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("ref_code", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), server_default="signed_up", nullable=False),
        sa.Column("signed_up_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("first_paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("churned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", name="uq_affiliate_referrals_user_id"),
    )
    op.create_index("ix_affiliate_referrals_affiliate_id", "affiliate_referrals", ["affiliate_id"])
    op.create_index("ix_affiliate_referrals_status", "affiliate_referrals", ["status"])

    op.create_table(
        "affiliate_commissions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("affiliate_id", UUID(as_uuid=True), nullable=False),
        sa.Column("referral_id", UUID(as_uuid=True), nullable=False),
        sa.Column("paddle_transaction_id", sa.String(255), nullable=False),
        sa.Column("paddle_subscription_id", sa.String(255), nullable=True),
        sa.Column("event_type", sa.String(30), nullable=False),
        sa.Column("gross_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("commission_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="USD", nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("payout_id", UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("paddle_transaction_id", name="uq_affiliate_commissions_paddle_txn"),
    )
    op.create_index("ix_affiliate_commissions_affiliate_id", "affiliate_commissions", ["affiliate_id"])
    op.create_index("ix_affiliate_commissions_status", "affiliate_commissions", ["status"])

    op.create_table(
        "affiliate_payouts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("affiliate_id", UUID(as_uuid=True), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), server_default="USD", nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("method", sa.String(30), server_default="paypal", nullable=False),
        sa.Column("reference", sa.String(255), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_affiliate_payouts_affiliate_id", "affiliate_payouts", ["affiliate_id"])


def downgrade() -> None:
    op.drop_index("ix_affiliate_payouts_affiliate_id", table_name="affiliate_payouts")
    op.drop_table("affiliate_payouts")
    op.drop_index("ix_affiliate_commissions_status", table_name="affiliate_commissions")
    op.drop_index("ix_affiliate_commissions_affiliate_id", table_name="affiliate_commissions")
    op.drop_table("affiliate_commissions")
    op.drop_index("ix_affiliate_referrals_status", table_name="affiliate_referrals")
    op.drop_index("ix_affiliate_referrals_affiliate_id", table_name="affiliate_referrals")
    op.drop_table("affiliate_referrals")
    op.drop_index("ix_profiles_referred_by_affiliate_id", table_name="profiles")
    op.drop_column("profiles", "referred_by_affiliate_id")
    op.drop_index("ix_affiliate_clicks_clicked_at", table_name="affiliate_clicks")
    op.drop_index("ix_affiliate_clicks_affiliate_id", table_name="affiliate_clicks")
    op.drop_table("affiliate_clicks")
    op.drop_index("ix_affiliate_refresh_tokens_token_hash", table_name="affiliate_refresh_tokens")
    op.drop_index("ix_affiliate_refresh_tokens_affiliate_id", table_name="affiliate_refresh_tokens")
    op.drop_table("affiliate_refresh_tokens")
    op.drop_index("ix_affiliates_status", table_name="affiliates")
    op.drop_index("ix_affiliates_ref_code", table_name="affiliates")
    op.drop_index("ix_affiliates_email", table_name="affiliates")
    op.drop_table("affiliates")
