"""Scale indexes for reminder polling, invoice lookups, and webhooks.

Revision ID: 018
Revises: 017
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "ix_reminder_jobs_pending_scheduled",
        "reminder_jobs",
        ["status", "scheduled_for"],
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.create_index("ix_invoices_client_id", "invoices", ["client_id"])
    op.create_index("ix_invoices_user_paid_at", "invoices", ["user_id", "paid_at"])
    op.create_index(
        "ix_invoices_user_sequence_started",
        "invoices",
        ["user_id", "sequence_started_at"],
    )
    op.create_index(
        "ix_reminder_messages_invoice_sent",
        "reminder_messages",
        ["invoice_id", "status", "sent_at"],
    )
    op.create_index("ix_quickbooks_connections_realm_id", "quickbooks_connections", ["realm_id"])
    op.create_index("ix_refresh_tokens_family_id", "refresh_tokens", ["family_id"])


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_family_id", table_name="refresh_tokens")
    op.drop_index("ix_quickbooks_connections_realm_id", table_name="quickbooks_connections")
    op.drop_index("ix_reminder_messages_invoice_sent", table_name="reminder_messages")
    op.drop_index("ix_invoices_user_sequence_started", table_name="invoices")
    op.drop_index("ix_invoices_user_paid_at", table_name="invoices")
    op.drop_index("ix_invoices_client_id", table_name="invoices")
    op.drop_index("ix_reminder_jobs_pending_scheduled", table_name="reminder_jobs")
