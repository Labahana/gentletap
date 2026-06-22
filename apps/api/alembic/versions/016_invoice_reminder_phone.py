"""Migration 016: per-invoice WhatsApp phone + import batch history

Revision ID: 016
Revises: 015
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016"
down_revision: Union[str, None] = "015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("reminder_phone", sa.String(50), nullable=True))
    op.execute(
        """
        UPDATE invoices i
        SET reminder_phone = c.phone
        FROM clients c
        WHERE i.client_id = c.id
          AND c.phone IS NOT NULL
          AND c.phone != ''
        """
    )

    op.create_table(
        "invoice_import_batches",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("imported_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skipped_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_outstanding", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("columns_found", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoice_import_batches_user_id", "invoice_import_batches", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_invoice_import_batches_user_id", table_name="invoice_import_batches")
    op.drop_table("invoice_import_batches")
    op.drop_column("invoices", "reminder_phone")
