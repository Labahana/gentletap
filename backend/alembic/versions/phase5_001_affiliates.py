"""affiliate program tables + org referral attribution column

Revision ID: phase5_001_affiliates
Revises: phase4_001_escalation_rules
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase5_001_affiliates"
down_revision: Union[str, None] = "phase4_001_escalation_rules"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    return sa.inspect(op.get_bind()).has_table(name)


def _existing_columns(name: str) -> set:
    insp = sa.inspect(op.get_bind())
    if not insp.has_table(name):
        return set()
    return {c["name"] for c in insp.get_columns(name)}


def upgrade() -> None:
    if not _has_table("affiliates"):
        op.create_table(
            "affiliates",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("email", sa.String(320), nullable=False, unique=True, index=True),
            sa.Column("password_hash", sa.String(255), nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("channel_name", sa.String(255), nullable=True),
            sa.Column("channel_url", sa.String(512), nullable=True),
            sa.Column("payout_email", sa.String(320), nullable=True),
            sa.Column("payout_method", sa.String(30), nullable=False, server_default="paypal"),
            sa.Column("payout_details", sa.String(1000), nullable=True),
            sa.Column("partner_type", sa.String(30), nullable=False, server_default="creator"),
            sa.Column("application_note", sa.String(2000), nullable=True),
            sa.Column("ref_code", sa.String(64), nullable=True, unique=True, index=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending", index=True),
            sa.Column("commission_rate", sa.Numeric(5, 4), nullable=False, server_default="0.3"),
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
            ),
        )

    if not _has_table("affiliate_refresh_tokens"):
        op.create_table(
            "affiliate_refresh_tokens",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("affiliate_id", sa.String(36), nullable=False, index=True),
            sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
            sa.Column("family_id", sa.String(36), nullable=False, index=True),
            sa.Column("used", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column(
                "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
            ),
        )

    if not _has_table("affiliate_clicks"):
        op.create_table(
            "affiliate_clicks",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("affiliate_id", sa.String(36), nullable=False, index=True),
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
                index=True,
            ),
        )

    if not _has_table("affiliate_referrals"):
        op.create_table(
            "affiliate_referrals",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("affiliate_id", sa.String(36), nullable=False, index=True),
            sa.Column("org_id", sa.String(36), nullable=False, index=True),
            sa.Column("ref_code", sa.String(64), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="signed_up", index=True),
            sa.Column("signed_up_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("first_paid_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("churned_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
            ),
            sa.UniqueConstraint("org_id", name="uq_affiliate_referrals_org_id"),
        )

    if not _has_table("affiliate_commissions"):
        op.create_table(
            "affiliate_commissions",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("affiliate_id", sa.String(36), nullable=False, index=True),
            sa.Column("referral_id", sa.String(36), nullable=False),
            sa.Column("paddle_transaction_id", sa.String(255), nullable=False),
            sa.Column("paddle_subscription_id", sa.String(255), nullable=True),
            sa.Column("event_type", sa.String(30), nullable=False),
            sa.Column("gross_amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("commission_amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending", index=True),
            sa.Column("payout_id", sa.String(36), nullable=True),
            sa.Column(
                "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
            ),
            sa.UniqueConstraint(
                "paddle_transaction_id", name="uq_affiliate_commissions_paddle_txn"
            ),
        )

    if not _has_table("affiliate_payouts"):
        op.create_table(
            "affiliate_payouts",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("affiliate_id", sa.String(36), nullable=False, index=True),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("currency", sa.String(3), nullable=False, server_default="USD"),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column("method", sa.String(30), nullable=False, server_default="paypal"),
            sa.Column("reference", sa.String(255), nullable=True),
            sa.Column("notes", sa.String(2000), nullable=True),
            sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
            ),
        )

    # Attribution cache on organizations (nullable add = idempotent-safe)
    cols = _existing_columns("organizations")
    if "referred_by_affiliate_id" not in cols:
        op.add_column(
            "organizations",
            sa.Column("referred_by_affiliate_id", sa.String(36), nullable=True),
        )


def downgrade() -> None:
    for name in (
        "affiliate_payouts",
        "affiliate_commissions",
        "affiliate_referrals",
        "affiliate_clicks",
        "affiliate_refresh_tokens",
        "affiliates",
    ):
        if _has_table(name):
            op.drop_table(name)
    if "referred_by_affiliate_id" in _existing_columns("organizations"):
        op.drop_column("organizations", "referred_by_affiliate_id")
