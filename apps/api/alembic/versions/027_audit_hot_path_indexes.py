"""Six indexes for hot query paths identified in the engineering audit.

Covers: per-invoice message dedup, WhatsApp monthly-quota / inbound-routing
scans, dashboard reminder-history joins, notification feed ordering,
agent-decision reads, and the free-plan collections count.

Revision ID: 027
Revises: 026
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "027"
down_revision: Union[str, None] = "026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Per-step message lookup / dedup in process_due_job.
    op.create_index(
        "ix_reminder_messages_invoice_step",
        "reminder_messages",
        ["invoice_id", "sequence_step", "channel"],
    )
    # WhatsApp monthly quota + shared-number inbound routing (channel/status/sent_at).
    op.create_index(
        "ix_reminder_messages_wa_sent",
        "reminder_messages",
        ["channel", "status", "sent_at"],
        postgresql_where=sa.text("channel = 'whatsapp' AND status = 'sent'"),
    )
    # Notification feed: per-user, newest-first, unread filter.
    op.create_index(
        "ix_user_notifications_user_unread_created",
        "user_notifications",
        ["user_id", sa.text("created_at DESC")],
        postgresql_where=sa.text("read_at IS NULL"),
    )
    # Free-plan monthly collections count.
    op.create_index(
        "ix_invoices_user_sequence_started_at",
        "invoices",
        ["user_id", "sequence_started_at"],
    )
    # Reminder history join per invoice ordered by send time.
    op.create_index(
        "ix_agent_decisions_invoice_created",
        "agent_decisions",
        ["invoice_id", sa.text("created_at DESC")],
    )
    # Dashboard invoice list: per-user open invoices ordered by overdue days.
    op.create_index(
        "ix_invoices_user_overdue",
        "invoices",
        ["user_id", "sequence_active", sa.text("days_overdue DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_invoices_user_overdue", table_name="invoices")
    op.drop_index("ix_agent_decisions_invoice_created", table_name="agent_decisions")
    op.drop_index("ix_invoices_user_sequence_started_at", table_name="invoices")
    op.drop_index("ix_user_notifications_user_unread_created", table_name="user_notifications")
    op.drop_index("ix_reminder_messages_wa_sent", table_name="reminder_messages")
    op.drop_index("ix_reminder_messages_invoice_step", table_name="reminder_messages")
