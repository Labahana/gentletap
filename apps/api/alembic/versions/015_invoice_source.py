"""Migration 015: invoice source and manual tracking fields

Revision ID: 015
Revises: 014
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "015"
down_revision: Union[str, None] = "014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("source", sa.String(20), nullable=True))
    op.add_column("invoices", sa.Column("imported_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("invoices", sa.Column("last_manual_update_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE invoices SET source = 'upload' WHERE qb_invoice_id LIKE 'csv:%'")
    op.execute("UPDATE invoices SET source = 'quickbooks' WHERE source IS NULL")


def downgrade() -> None:
    op.drop_column("invoices", "last_manual_update_at")
    op.drop_column("invoices", "imported_at")
    op.drop_column("invoices", "source")
