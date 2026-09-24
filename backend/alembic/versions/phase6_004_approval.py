"""reminder_schedule.approved_at: per-row approval marker for autonomy gate

Revision ID: phase6_004_approval
Revises: phase6_003_reminder_jobs
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase6_004_approval"
down_revision: Union[str, None] = "phase6_003_reminder_jobs"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not sa.inspect(op.get_bind()).has_table("reminder_schedule"):
        return
    if not _has_column("reminder_schedule", "approved_at"):
        op.add_column(
            "reminder_schedule",
            sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("reminder_schedule") and _has_column(
        "reminder_schedule", "approved_at"
    ):
        op.drop_column("reminder_schedule", "approved_at")
