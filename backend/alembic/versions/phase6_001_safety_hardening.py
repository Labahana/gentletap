"""safety hardening: reminder_schedule attempts + updated_at

Revision ID: phase6_001_safety_hardening
Revises: phase5_002_whatsapp_inbound
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase6_001_safety_hardening"
down_revision: Union[str, None] = "phase5_002_whatsapp_inbound"
branch_labels = None
depends_on = None


def _columns(table: str):
    insp = sa.inspect(op.get_bind())
    if not insp.has_table(table):
        return {}
    return {c["name"] for c in insp.get_columns(table)}


def upgrade() -> None:
    cols = _columns("reminder_schedule")
    if not cols:
        return
    if "attempts" not in cols:
        op.add_column(
            "reminder_schedule",
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        )
    if "updated_at" not in cols:
        op.add_column(
            "reminder_schedule",
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.func.now(),
            ),
        )


def downgrade() -> None:
    cols = _columns("reminder_schedule")
    if "updated_at" in cols:
        op.drop_column("reminder_schedule", "updated_at")
    if "attempts" in cols:
        op.drop_column("reminder_schedule", "attempts")
