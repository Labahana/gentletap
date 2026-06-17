"""production schema: email, sequences, reminders

Revision ID: 003
Revises: 002
Create Date: 2026-06-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("family_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"])

    op.create_table(
        "google_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("google_email", sa.String(320), nullable=False),
        sa.Column("access_token_enc", sa.Text(), nullable=False),
        sa.Column("refresh_token_enc", sa.Text(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_google_connections_user_id", "google_connections", ["user_id"], unique=True)

    op.create_table(
        "email_senders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email_address", sa.String(320), nullable=False),
        sa.Column("provider", sa.String(20), nullable=False, server_default="resend"),
        sa.Column("verification_status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("resend_sender_id", sa.String(64), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_primary", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_email_senders_user_id", "email_senders", ["user_id"])

    op.create_table(
        "email_preferences",
        sa.Column("user_id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("send_provider", sa.String(20), nullable=False, server_default="google"),
        sa.Column("require_approval", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("first_batch_approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.add_column("clients", sa.Column("avg_days_to_pay", sa.Numeric(8, 2), nullable=True))
    op.add_column("clients", sa.Column("late_payment_rate", sa.Numeric(5, 4), server_default="0", nullable=False))
    op.add_column("clients", sa.Column("invoices_paid_on_time", sa.Integer(), server_default="0", nullable=False))
    op.add_column("clients", sa.Column("invoices_paid_late", sa.Integer(), server_default="0", nullable=False))
    op.add_column("clients", sa.Column("lifetime_value", sa.Numeric(14, 2), server_default="0", nullable=False))
    op.add_column("clients", sa.Column("tenure_months", sa.Integer(), server_default="0", nullable=False))
    op.add_column("clients", sa.Column("communication_style", sa.String(20), server_default="unknown", nullable=False))
    op.add_column("clients", sa.Column("risk_level", sa.String(20), server_default="medium", nullable=False))
    op.add_column("clients", sa.Column("preferred_channel", sa.String(20), server_default="email", nullable=False))
    op.add_column("clients", sa.Column("profile_updated_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("invoices", sa.Column("sequence_active", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("invoices", sa.Column("sequence_step", sa.Integer(), server_default="0", nullable=False))
    op.add_column("invoices", sa.Column("sequence_paused", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("invoices", sa.Column("sequence_approved", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("invoices", sa.Column("dispute_flag", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("invoices", sa.Column("client_responded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("invoices", sa.Column("last_reminder_sent_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "reminder_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("sequence_step", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("tone", sa.String(20), nullable=True),
        sa.Column("channel", sa.String(20), nullable=False, server_default="email"),
        sa.Column("send_provider", sa.String(20), nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("external_message_id", sa.String(255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_reminder_messages_invoice_id", "reminder_messages", ["invoice_id"])

    op.create_table(
        "reminder_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sequence_step", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("invoice_id", "sequence_step", name="uq_reminder_jobs_invoice_step"),
    )
    op.create_index("ix_reminder_jobs_invoice_id", "reminder_jobs", ["invoice_id"])

    op.create_table(
        "agent_decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("decision", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_agent_decisions_invoice_id", "agent_decisions", ["invoice_id"])

    op.create_table(
        "user_notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_user_notifications_user_id", "user_notifications", ["user_id"])


def downgrade() -> None:
    op.drop_table("user_notifications")
    op.drop_table("agent_decisions")
    op.drop_table("reminder_jobs")
    op.drop_table("reminder_messages")
    for col in (
        "last_reminder_sent_at",
        "client_responded_at",
        "dispute_flag",
        "sequence_approved",
        "sequence_paused",
        "sequence_step",
        "sequence_active",
    ):
        op.drop_column("invoices", col)
    for col in (
        "profile_updated_at",
        "preferred_channel",
        "risk_level",
        "communication_style",
        "tenure_months",
        "lifetime_value",
        "invoices_paid_late",
        "invoices_paid_on_time",
        "late_payment_rate",
        "avg_days_to_pay",
    ):
        op.drop_column("clients", col)
    op.drop_table("email_preferences")
    op.drop_table("email_senders")
    op.drop_table("google_connections")
    op.drop_table("refresh_tokens")
