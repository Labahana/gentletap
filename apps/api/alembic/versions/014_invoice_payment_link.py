"""Invoice QuickBooks payment link

Revision ID: 014
Revises: 013
Create Date: 2026-06-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "014"
down_revision: Union[str, None] = "013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("invoices", sa.Column("payment_link", sa.String(2048), nullable=True))


def downgrade() -> None:
    op.drop_column("invoices", "payment_link")
