"""escalation rules

Revision ID: phase4_001_escalation_rules
Revises: phase3_001_notifications
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase4_001_escalation_rules"
down_revision: Union[str, None] = "phase3_001_notifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "escalation_rules",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False, index=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("conditions", sa.JSON(), nullable=True),
        sa.Column("actions", sa.JSON(), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("escalation_rules")
