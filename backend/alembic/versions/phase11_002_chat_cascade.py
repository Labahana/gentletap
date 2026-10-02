"""chat FKs -> ON DELETE CASCADE (GDPR purge safety net)

Support-chat rows must disappear with their org/session so no visitor email or
transcript outlives an account deletion. Drops the plain FKs created in
phase11_001 and recreates them with ON DELETE CASCADE. Postgres-only (prod);
SQLite test DBs build these constraints from the models directly.

Revision ID: phase11_002_chat_cascade
Revises: phase11_001_chat_tables
"""
from typing import Optional, Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase11_002_chat_cascade"
down_revision: Union[str, None] = "phase11_001_chat_tables"
branch_labels = None
depends_on = None

# (table, column, ref_table, ref_col)
_TARGETS = [
    ("chat_sessions", "org_id", "organizations", "id"),
    ("chat_messages", "session_id", "chat_sessions", "id"),
    ("chat_handoffs", "session_id", "chat_sessions", "id"),
    ("chat_handoffs", "org_id", "organizations", "id"),
]


def _is_postgres() -> bool:
    return op.get_bind().dialect.name == "postgresql"


def _fk_info(table: str, column: str) -> Optional[tuple]:
    """Return (constraint_name, confdeltype) for this column's FK, or None."""
    row = op.get_bind().execute(
        sa.text(
            """
            SELECT con.conname AS name, con.confdeltype AS deltype
            FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = con.conkey[1]
            WHERE rel.relname = :t AND att.attname = :c AND con.contype = 'f'
            """
        ),
        {"t": table, "c": column},
    ).first()
    return (row[0], row[1]) if row else None


def _swap(table: str, column: str, ref_table: str, ref_col: str, cascade: bool) -> None:
    info = _fk_info(table, column)
    want = "c" if cascade else "n"  # confdeltype: c=CASCADE, n=NO ACTION
    if info is not None and info[1] == want:
        return  # already in the desired state
    if info is not None:
        op.drop_constraint(info[0], table, type_="fk")
    ondelete = "CASCADE" if cascade else None
    op.create_foreign_key(
        f"fk_{table}_{column}", table, ref_table, [column], [ref_col], ondelete=ondelete
    )


def upgrade() -> None:
    if not _is_postgres():
        return
    insp = sa.inspect(op.get_bind())
    for table, column, ref_table, ref_col in _TARGETS:
        if insp.has_table(table):
            _swap(table, column, ref_table, ref_col, cascade=True)


def downgrade() -> None:
    if not _is_postgres():
        return
    insp = sa.inspect(op.get_bind())
    for table, column, ref_table, ref_col in _TARGETS:
        if insp.has_table(table):
            _swap(table, column, ref_table, ref_col, cascade=False)
