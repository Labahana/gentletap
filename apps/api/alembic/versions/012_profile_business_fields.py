"""Profile business fields for onboarding

Revision ID: 012
Revises: 011
Create Date: 2026-06-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012"
down_revision: Union[str, None] = "011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("profiles", sa.Column("company_name", sa.String(255), nullable=True))
    op.add_column("profiles", sa.Column("email_display_name", sa.String(255), nullable=True))
    op.add_column("profiles", sa.Column("phone", sa.String(50), nullable=True))
    op.add_column("profiles", sa.Column("website", sa.String(255), nullable=True))
    op.add_column("profiles", sa.Column("logo_url", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("profiles", "logo_url")
    op.drop_column("profiles", "website")
    op.drop_column("profiles", "phone")
    op.drop_column("profiles", "email_display_name")
    op.drop_column("profiles", "company_name")
