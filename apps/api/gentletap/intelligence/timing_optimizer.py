from datetime import UTC, datetime

from gentletap.intelligence.schemas import ReminderContext


def next_send_window(ctx: ReminderContext) -> datetime:
    """When a due job runs, send now.

    Step 0 (first reminder after go-live): immediate, any time — so users see value right away.
    Steps 1+: send when the job is due; spacing between steps is set in sequences.py.
    """
    return datetime.now(UTC)
