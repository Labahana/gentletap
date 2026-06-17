"""Client relationship profiles from QuickBooks invoice history."""

from datetime import UTC, date, datetime

from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice, QuickBooksConnection
from gentletap.integrations.quickbooks import client as qb_client


def _months_between(start: date, end: date) -> int:
    return max(0, (end.year - start.year) * 12 + (end.month - start.month))


def profile_client(db: Session, client: Client) -> None:
    connection = (
        db.query(QuickBooksConnection)
        .filter(
            QuickBooksConnection.user_id == client.user_id,
            QuickBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        return

    try:
        paid_rows = qb_client.query(
            db,
            connection,
            f"SELECT * FROM Invoice WHERE CustomerRef = '{client.qb_customer_id}' AND Balance = '0' MAXRESULTS 100",
        )
    except Exception:
        paid_rows = []

    on_time = 0
    late = 0
    days_list: list[int] = []
    total_value = 0.0
    first_date: date | None = None

    for row in paid_rows:
        amount = float(row.get("TotalAmt", 0))
        total_value += amount
        txn_date = row.get("TxnDate")
        due_date = row.get("DueDate")
        if txn_date:
            d = date.fromisoformat(txn_date)
            first_date = d if first_date is None or d < first_date else first_date
        if due_date and txn_date:
            days = (date.fromisoformat(txn_date) - date.fromisoformat(due_date)).days
            days_list.append(days)
            if days <= 0:
                on_time += 1
            else:
                late += 1

    total_paid = on_time + late
    late_rate = (late / total_paid) if total_paid else 0.0
    avg_days = sum(days_list) / len(days_list) if days_list else None
    tenure = _months_between(first_date, date.today()) if first_date else 0

    if late_rate >= 0.5:
        risk = "high"
    elif late_rate >= 0.25:
        risk = "medium"
    else:
        risk = "low"

    client.avg_days_to_pay = avg_days
    client.late_payment_rate = late_rate
    client.invoices_paid_on_time = on_time
    client.invoices_paid_late = late
    client.lifetime_value = total_value
    client.tenure_months = tenure
    client.risk_level = risk
    client.profile_updated_at = datetime.now(UTC)


def reprofile_user_clients(db: Session, user_id) -> int:
    clients = db.query(Client).filter(Client.user_id == user_id).all()
    for client in clients:
        profile_client(db, client)
    db.commit()
    return len(clients)
