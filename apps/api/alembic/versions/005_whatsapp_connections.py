"""whatsapp connections, followup jobs, profile credits/timezone

Revision ID: 005
Revises: 004
Create Date: 2026-06-16

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "profiles",
        sa.Column("timezone", sa.String(64), nullable=False, server_default="America/New_York"),
    )
    op.add_column(
        "profiles",
        sa.Column("whatsapp_message_credits", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "whatsapp_connections",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mode", sa.String(20), nullable=False),
        sa.Column("phone_e164", sa.String(50), nullable=True),
        sa.Column("sender_sid", sa.String(64), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", name="uq_whatsapp_connections_user_id"),
    )
    op.create_index("ix_whatsapp_connections_user_id", "whatsapp_connections", ["user_id"])

    op.create_table(
        "whatsapp_followup_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("invoice_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sequence_step", sa.Integer(), nullable=False),
        sa.Column("tone", sa.String(20), nullable=True),
        sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="pending"),
        sa.Column("reminder_message_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("invoice_id", "sequence_step", name="uq_whatsapp_followup_invoice_step"),
    )
    op.create_index("ix_whatsapp_followup_jobs_user_id", "whatsapp_followup_jobs", ["user_id"])
    op.create_index("ix_whatsapp_followup_jobs_scheduled", "whatsapp_followup_jobs", ["status", "scheduled_for"])


def downgrade() -> None:
    op.drop_index("ix_whatsapp_followup_jobs_scheduled", table_name="whatsapp_followup_jobs")
    op.drop_index("ix_whatsapp_followup_jobs_user_id", table_name="whatsapp_followup_jobs")
    op.drop_table("whatsapp_followup_jobs")
    op.drop_index("ix_whatsapp_connections_user_id", table_name="whatsapp_connections")
    op.drop_table("whatsapp_connections")
    op.drop_column("profiles", "whatsapp_message_credits")
    op.drop_column("profiles", "timezone")
