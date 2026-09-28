"""invoices.payment_link: manual pay URL surfaced in reminder email/WhatsApp CTAs

Revision ID: phase8_001_payment_link
Revises: phase7_001_sequence_tail
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase8_001_payment_link"
down_revision: Union[str, None] = "phase7_001_sequence_tail"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not sa.inspect(op.get_bind()).has_table("invoices"):
        return
    if not _has_column("invoices", "payment_link"):
        op.add_column(
            "invoices",
            sa.Column("payment_link", sa.String(2048), nullable=True),
        )


def downgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("invoices") and _has_column("invoices", "payment_link"):
        op.drop_column("invoices", "payment_link")
