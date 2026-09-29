"""Admin controls: users.is_active flag + audit_logs.org_id nullable (global admin actions)

Revision ID: phase9_001_admin_controls
Revises: phase8_001_payment_link
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase9_001_admin_controls"
down_revision: Union[str, None] = "phase8_001_payment_link"
branch_labels = None
depends_on = None


def _has_column(table: str, column: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return any(c["name"] == column for c in insp.get_columns(table))


def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("users") and not _has_column("users", "is_active"):
        op.add_column(
            "users",
            sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        )
    if sa.inspect(op.get_bind()).has_table("audit_logs") and _has_column("audit_logs", "org_id"):
        op.alter_column("audit_logs", "org_id", existing_type=sa.String(36), nullable=True)


def downgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("audit_logs") and _has_column("audit_logs", "org_id"):
        op.alter_column("audit_logs", "org_id", existing_type=sa.String(36), nullable=False)
    if sa.inspect(op.get_bind()).has_table("users") and _has_column("users", "is_active"):
        op.drop_column("users", "is_active")
