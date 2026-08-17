import csv
import io
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.invoice import Invoice
from app.schemas.invoice import CSVPreviewRow, CSVImportPreviewResponse

logger = logging.getLogger(__name__)


def parse_and_preview_csv(file_contents: bytes) -> CSVImportPreviewResponse:
    text = file_contents.decode("utf-8-sig", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))

    preview_rows: List[CSVPreviewRow] = []
    valid_count = 0
    invalid_count = 0

    # Normalize header names (lowercase, strip, replace spaces with underscores)
    fieldnames = [f.strip().lower().replace(" ", "_") for f in (reader.fieldnames or [])]

    for idx, raw_row in enumerate(reader):
        row = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in raw_row.items() if k}
        inv_num = row.get("invoice_number") or row.get("number") or row.get("invoice_id") or f"CSV-{idx+1}"
        client_name = row.get("client_name") or row.get("client") or row.get("customer") or ""
        client_email = row.get("client_email") or row.get("email") or None
        amount_str = row.get("amount") or row.get("total") or "0"
        currency = row.get("currency") or "USD"
        due_date = row.get("due_date") or None
        issue_date = row.get("issue_date") or None

        is_valid = True
        error_msg = None

        if not client_name:
            is_valid = False
            error_msg = "Missing client name"
        else:
            try:
                amt = float(amount_str.replace("$", "").replace(",", ""))
                if amt <= 0:
                    is_valid = False
                    error_msg = "Amount must be greater than zero"
            except ValueError:
                is_valid = False
                error_msg = f"Invalid amount value: {amount_str}"

        if is_valid:
            valid_count += 1
            amt_val = float(amount_str.replace("$", "").replace(",", ""))
        else:
            invalid_count += 1
            amt_val = 0.0

        preview_rows.append(
            CSVPreviewRow(
                invoice_number=inv_num,
                client_name=client_name or f"Row {idx+1} Client",
                client_email=client_email,
                amount=amt_val,
                currency=currency,
                due_date=due_date,
                issue_date=issue_date,
                is_valid=is_valid,
                error_message=error_msg,
            )
        )

    return CSVImportPreviewResponse(
        total_rows=len(preview_rows),
        valid_rows_count=valid_count,
        invalid_rows_count=invalid_count,
        preview=preview_rows,
    )


def execute_csv_import(db: Session, org_id: str, rows: List[CSVPreviewRow]) -> int:
    imported_count = 0

    for row in rows:
        if not row.is_valid:
            continue

        # 1. Upsert Client
        client = db.query(Client).filter(Client.org_id == org_id, Client.name == row.client_name).first()
        if not client:
            client = Client(
                org_id=org_id,
                name=row.client_name,
                email=row.client_email,
                currency=row.currency or "USD",
            )
            db.add(client)
            db.commit()
            db.refresh(client)
        elif row.client_email and not client.email:
            client.email = row.client_email
            db.commit()

        # Parse dates if valid string
        parsed_due_date = None
        if row.due_date:
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
                try:
                    parsed_due_date = datetime.strptime(row.due_date, fmt).date()
                    break
                except ValueError:
                    pass

        parsed_issue_date = None
        if row.issue_date:
            for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y"):
                try:
                    parsed_issue_date = datetime.strptime(row.issue_date, fmt).date()
                    break
                except ValueError:
                    pass

        # 2. Upsert Invoice
        invoice = db.query(Invoice).filter(Invoice.org_id == org_id, Invoice.number == row.invoice_number).first()
        if not invoice:
            invoice = Invoice(
                org_id=org_id,
                number=row.invoice_number,
                client_id=client.id,
                amount=row.amount,
                balance=row.amount,
                currency=row.currency or "USD",
                due_date=parsed_due_date,
                issue_date=parsed_issue_date,
                status="unpaid",
                imported_from="csv",
            )
            db.add(invoice)
        else:
            invoice.amount = row.amount
            invoice.balance = row.amount
            if parsed_due_date: invoice.due_date = parsed_due_date
            if parsed_issue_date: invoice.issue_date = parsed_issue_date

        imported_count += 1

    db.commit()
    return imported_count
