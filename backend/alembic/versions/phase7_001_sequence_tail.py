"""sequences.repeat_final_step_every_days: keep-chasing tail after the last step

Revision ID: phase7_001_sequence_tail
Revises: phase6_004_approval
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase7_001_sequence_tail"
down_revision: Union[str, None] = "phase6_004_approval"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if not sa.inspect(op.get_bind()).has_table("sequences"):
        return
    if not _has_column("sequences", "repeat_final_step_every_days"):
        op.add_column(
            "sequences",
            sa.Column("repeat_final_step_every_days", sa.Integer(), server_default="0", nullable=False),
        )


def downgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("sequences") and _has_column(
        "sequences", "repeat_final_step_every_days"
    ):
        op.drop_column("sequences", "repeat_final_step_every_days")
