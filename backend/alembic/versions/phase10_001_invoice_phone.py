"""invoices.reminder_phone: per-invoice WhatsApp recipient override

Hybrid contact model: WhatsApp resolves invoice.reminder_phone ?? client.phone.
This column adds the optional per-invoice override; the client default already exists.

Revision ID: phase10_001_invoice_phone
Revises: phase9_001_admin_controls
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase10_001_invoice_phone"
down_revision: Union[str, None] = "phase9_001_admin_controls"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not sa.inspect(op.get_bind()).has_table("invoices"):
        return
    if not _has_column("invoices", "reminder_phone"):
        op.add_column(
            "invoices",
            sa.Column("reminder_phone", sa.String(50), nullable=True),
        )


def downgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("invoices") and _has_column("invoices", "reminder_phone"):
        op.drop_column("invoices", "reminder_phone")
