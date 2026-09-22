"""reminder_jobs: lazy per-step dispatch layer over reminder_schedule

Revision ID: phase6_003_reminder_jobs
Revises: phase6_002_control_center
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "phase6_003_reminder_jobs"
down_revision: Union[str, None] = "phase6_002_control_center"
branch_labels = None
depends_on = None


def _has_table(table: str) -> bool:
    insp = sa.inspect(op.get_bind())
    return insp.has_table(table)


def upgrade() -> None:
    if not _has_table("reminder_schedule"):
        return

    if not _has_table("reminder_jobs"):
        op.create_table(
            "reminder_jobs",
            sa.Column("id", sa.String(36), primary_key=True),
            sa.Column("org_id", sa.String(36), sa.ForeignKey("organizations.id"), nullable=False),
            sa.Column("invoice_id", sa.String(36), sa.ForeignKey("invoices.id"), nullable=False),
            sa.Column("sequence_id", sa.String(36), sa.ForeignKey("sequences.id"), nullable=True),
            sa.Column("sequence_step", sa.Integer(), nullable=False),
            sa.Column("scheduled_for", sa.DateTime(timezone=True), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
            sa.Column("celery_task_id", sa.String(255), nullable=True),
            sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("last_error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("invoice_id", "sequence_step", name="uq_reminder_jobs_invoice_step"),
        )
        op.create_index("ix_reminder_jobs_org_id", "reminder_jobs", ["org_id"])
        op.create_index("ix_reminder_jobs_invoice_id", "reminder_jobs", ["invoice_id"])
        op.create_index("ix_reminder_jobs_scheduled_for", "reminder_jobs", ["scheduled_for"])

    # Backfill: one pending job per invoice at its earliest pending schedule row.
    conn = op.get_bind()
    existing = {
        (r[0], r[1])
        for r in conn.execute(
            sa.text("SELECT invoice_id, sequence_step FROM reminder_jobs")
        ).fetchall()
    }
    rows = conn.execute(
        sa.text(
            """
            SELECT s.invoice_id, s.org_id, s.step_index, s.scheduled_at,
                   a.sequence_id
            FROM reminder_schedule s
            LEFT JOIN sequence_assignments a ON a.invoice_id = s.invoice_id
            WHERE s.status = 'pending'
              AND s.id = (
                  SELECT s2.id FROM reminder_schedule s2
                  WHERE s2.invoice_id = s.invoice_id AND s2.status = 'pending'
                  ORDER BY s2.step_index ASC, s2.scheduled_at ASC LIMIT 1
              )
            """
        )
    ).fetchall()

    import uuid

    for invoice_id, org_id, step_index, scheduled_at, sequence_id in rows:
        if (invoice_id, step_index) in existing:
            continue
        new_id = str(uuid.uuid4())
        conn.execute(
            sa.text(
                """
                INSERT INTO reminder_jobs
                    (id, org_id, invoice_id, sequence_id, sequence_step,
                     scheduled_for, status, attempts)
                VALUES
                    (:id, :org_id, :invoice_id, :sequence_id,
                     :step, :scheduled_for, 'pending', 0)
                """
            ),
            {
                "id": new_id,
                "org_id": org_id,
                "invoice_id": invoice_id,
                "sequence_id": sequence_id,
                "step": step_index,
                "scheduled_for": scheduled_at,
            },
        )


def downgrade() -> None:
    if _has_table("reminder_jobs"):
        op.drop_table("reminder_jobs")
