"""Migration 010: webhook idempotency and WA job constraints

Revision ID: 010
Revises: 009
Create Date: 2026-06-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010"
down_revision: Union[str, None] = "009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "integration_webhook_events",
        sa.Column("event_key", sa.String(512), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.drop_constraint("uq_whatsapp_followup_invoice_step", "whatsapp_followup_jobs", type_="unique")
    op.create_index(
        "uq_whatsapp_followup_pending_step",
        "whatsapp_followup_jobs",
        ["invoice_id", "sequence_step"],
        unique=True,
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.create_index(
        "uq_whatsapp_inbound_external_sid",
        "whatsapp_inbound_messages",
        ["external_sid"],
        unique=True,
        postgresql_where=sa.text("external_sid IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_whatsapp_inbound_external_sid", table_name="whatsapp_inbound_messages")
    op.drop_index("uq_whatsapp_followup_pending_step", table_name="whatsapp_followup_jobs")
    op.create_unique_constraint(
        "uq_whatsapp_followup_invoice_step",
        "whatsapp_followup_jobs",
        ["invoice_id", "sequence_step"],
    )
    op.drop_table("integration_webhook_events")
