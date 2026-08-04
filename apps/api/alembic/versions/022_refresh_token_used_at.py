"""Track refresh-token usage time for rotation grace window.

Revision ID: 022
Revises: 021
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("refresh_tokens", sa.Column("used_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "affiliate_refresh_tokens",
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("affiliate_refresh_tokens", "used_at")
    op.drop_column("refresh_tokens", "used_at")
