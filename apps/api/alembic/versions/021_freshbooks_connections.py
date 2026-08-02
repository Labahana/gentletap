"""FreshBooks connections table.

Revision ID: 021
Revises: 020
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "freshbooks_connections",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", UUID(as_uuid=True), nullable=False),
        sa.Column("account_id", sa.String(64), nullable=False),
        sa.Column("business_id", sa.Integer(), nullable=True),
        sa.Column("business_name", sa.String(255), nullable=True),
        sa.Column("access_token_enc", sa.Text(), nullable=False),
        sa.Column("refresh_token_enc", sa.Text(), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("webhook_verifier_enc", sa.Text(), nullable=True),
        sa.Column("last_sync_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("connected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("disconnected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_freshbooks_connections_user_id", "freshbooks_connections", ["user_id"], unique=True)
    op.create_index("ix_freshbooks_connections_account_id", "freshbooks_connections", ["account_id"])


def downgrade() -> None:
    op.drop_index("ix_freshbooks_connections_account_id", table_name="freshbooks_connections")
    op.drop_index("ix_freshbooks_connections_user_id", table_name="freshbooks_connections")
    op.drop_table("freshbooks_connections")
