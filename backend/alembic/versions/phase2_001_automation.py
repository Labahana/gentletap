"""phase2 automation tables and columns

Revision ID: phase2_001
Revises:
Create Date: 2026-08-16
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "phase2_001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Additive columns (safe if create_all already applied in dev)
    with op.batch_alter_table("invoices") as batch:
        batch.add_column(sa.Column("first_overdue_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("messages") as batch:
        batch.add_column(sa.Column("ai_provider_used", sa.String(20), nullable=True))
        batch.add_column(sa.Column("clicked_at", sa.DateTime(timezone=True), nullable=True))

    with op.batch_alter_table("sequences") as batch:
        batch.add_column(sa.Column("is_default", sa.Boolean(), server_default="0", nullable=False))
        batch.add_column(sa.Column("auto_assign", sa.Boolean(), server_default="0", nullable=False))

    with op.batch_alter_table("templates") as batch:
        batch.add_column(sa.Column("ai_generated", sa.Boolean(), server_default="0", nullable=False))
        batch.add_column(sa.Column("ai_approved", sa.Boolean(), server_default="1", nullable=False))

    op.create_table(
        "reminder_schedule",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("invoice_id", sa.String(36), sa.ForeignKey("invoices.id"), nullable=False, index=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("step_index", sa.Integer(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("tone", sa.String(20), nullable=False),
        sa.Column("template_id", sa.String(36), sa.ForeignKey("templates.id"), nullable=True),
        sa.Column("channel", sa.String(20), server_default="email", nullable=False),
        sa.Column("status", sa.String(20), server_default="pending", nullable=False),
        sa.Column("skip_reason", sa.String(255), nullable=True),
        sa.Column("sent_message_id", sa.String(36), sa.ForeignKey("messages.id"), nullable=True),
        sa.Column("draft_subject", sa.String(500), nullable=True),
        sa.Column("draft_body", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "client_profiles",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("client_id", sa.String(36), sa.ForeignKey("clients.id"), nullable=False, unique=True, index=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("avg_days_to_pay", sa.Float(), server_default="0", nullable=False),
        sa.Column("reliability_score", sa.Integer(), server_default="100", nullable=False),
        sa.Column("late_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("dispute_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_invoices", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_paid", sa.Integer(), server_default="0", nullable=False),
        sa.Column("history", sa.JSON(), nullable=True),
        sa.Column("preferences", sa.JSON(), nullable=True),
        sa.Column("last_updated", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "suppressions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("email_or_phone", sa.String(320), nullable=False, index=True),
        sa.Column("channel", sa.String(20), server_default="email", nullable=False),
        sa.Column("source", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "org_settings",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False, unique=True, index=True),
        sa.Column("operation_mode", sa.String(20), server_default="template", nullable=False),
        sa.Column("timezone", sa.String(64), server_default="America/New_York", nullable=False),
        sa.Column("signature", sa.Text(), nullable=True),
        sa.Column("branding_logo_url", sa.String(512), nullable=True),
        sa.Column("send_thank_you", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("daily_digest", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("payment_alerts", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("escalation_alerts", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("stop_after_days", sa.Integer(), server_default="30", nullable=False),
        sa.Column("contact_window_enabled", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("email_notifications", sa.Boolean(), server_default="1", nullable=False),
        sa.Column("digest_frequency", sa.String(20), server_default="daily", nullable=False),
        sa.Column("reminder_defaults", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("org_settings")
    op.drop_table("suppressions")
    op.drop_table("client_profiles")
    op.drop_table("reminder_schedule")
    with op.batch_alter_table("templates") as batch:
        batch.drop_column("ai_approved")
        batch.drop_column("ai_generated")
    with op.batch_alter_table("sequences") as batch:
        batch.drop_column("auto_assign")
        batch.drop_column("is_default")
    with op.batch_alter_table("messages") as batch:
        batch.drop_column("clicked_at")
        batch.drop_column("ai_provider_used")
    with op.batch_alter_table("invoices") as batch:
        batch.drop_column("first_overdue_at")
