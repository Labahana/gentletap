import io
import json
import re
import uuid
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

import pandas as pd
from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice, InvoiceImportBatch, Profile
from gentletap.integrations.quickbooks.sync import _invoice_status, _parse_date
from gentletap.integrations.twilio.phone import normalize_phone_e164
from gentletap.plans import has_whatsapp

COLUMN_ALIASES: dict[str, list[str]] = {
    "client_name": ["client_name", "customer", "customer_name", "client", "name"],
    "client_email": ["client_email", "email", "customer_email", "e-mail"],
    "client_phone": ["client_phone", "phone", "mobile", "whatsapp", "cell", "customer_phone"],
    "invoice_number": ["invoice_number", "doc_number", "invoice_no", "invoice", "number", "invoice_#"],
    "amount": ["amount", "total", "invoice_amount", "total_amount"],
    "balance": ["balance", "outstanding", "amount_due"],
    "due_date": ["due_date", "due", "payment_due"],
    "invoice_date": ["invoice_date", "date", "issue_date"],
    "currency": ["currency", "curr"],
}


def _normalize_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", str(value).lower().strip()).strip("_")


def _resolve_column(headers: dict[str, str], field: str) -> str | None:
    for alias in COLUMN_ALIASES[field]:
        key = _normalize_header(alias)
        if key in headers:
            return headers[key]
    return None


def _parse_decimal(value) -> Decimal | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    text = str(value).strip().replace(",", "").replace("$", "")
    if not text:
        return None
    try:
        return Decimal(text)
    except InvalidOperation:
        return None


def _parse_date_value(value) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    if hasattr(value, "date"):
        return value.date().isoformat()
    text = str(value).strip()
    if not text:
        return None
    parsed = pd.to_datetime(text, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.date().isoformat()


def _customer_key(name: str, email: str | None) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")[:32]
    if email:
        slug = f"{slug}-{re.sub(r'[^a-z0-9@._-]+', '', email.lower())[:20]}"
    return f"csv:{slug}"[:64]


def _load_dataframe(content: bytes, filename: str) -> pd.DataFrame:
    lower = filename.lower()
    if lower.endswith((".xlsx", ".xls")):
        return pd.read_excel(io.BytesIO(content))
    return pd.read_csv(io.BytesIO(content))


def import_invoices_from_file(db: Session, user_id: UUID, content: bytes, filename: str) -> dict:
    if not filename.lower().endswith((".csv", ".xlsx", ".xls")):
        raise ValueError("Upload a CSV or Excel spreadsheet (.csv, .xlsx, .xls)")

    df = _load_dataframe(content, filename)
    if df.empty:
        raise ValueError("The file has no rows")

    raw_headers = {str(col): str(col) for col in df.columns}
    headers = {_normalize_header(col): col for col in df.columns}

    name_col = _resolve_column(headers, "client_name")
    if not name_col:
        raise ValueError("Missing client name column — use client_name, customer, or client")

    email_col = _resolve_column(headers, "client_email")
    if not email_col:
        raise ValueError("Missing client email column — use client_email, email, or customer_email")

    phone_col = _resolve_column(headers, "client_phone")

    number_col = _resolve_column(headers, "invoice_number")
    amount_col = _resolve_column(headers, "amount")
    balance_col = _resolve_column(headers, "balance")
    due_col = _resolve_column(headers, "due_date")
    if not due_col:
        raise ValueError("Missing due date column — use due_date or due")

    invoice_date_col = _resolve_column(headers, "invoice_date")
    currency_col = _resolve_column(headers, "currency")

    if not amount_col and not balance_col:
        raise ValueError("Missing amount column — use amount, total, or balance")

    user = db.query(Profile).filter(Profile.id == user_id).one()
    import_whatsapp_phones = has_whatsapp(user.plan)

    client_cache: dict[str, Client] = {}
    imported = 0
    skipped = 0
    total_outstanding = Decimal("0")

    for idx, row in df.iterrows():
        name = str(row[name_col]).strip() if pd.notna(row[name_col]) else ""
        if not name or name.lower() == "nan":
            skipped += 1
            continue

        email = None
        if pd.notna(row[email_col]):
            email = str(row[email_col]).strip() or None
        if not email or "@" not in email:
            skipped += 1
            continue

        phone = None
        if phone_col and pd.notna(row[phone_col]):
            raw_phone = str(row[phone_col]).strip()
            if raw_phone and raw_phone.lower() != "nan":
                phone = normalize_phone_e164(raw_phone) or raw_phone

        amount = _parse_decimal(row[amount_col]) if amount_col else None
        balance = _parse_decimal(row[balance_col]) if balance_col else None
        if balance is None:
            balance = amount
        if amount is None:
            amount = balance
        if balance is None or balance <= 0:
            skipped += 1
            continue

        due_raw = _parse_date_value(row[due_col]) if due_col else None
        invoice_date_raw = _parse_date_value(row[invoice_date_col]) if invoice_date_col else None
        due_date = _parse_date(due_raw)
        invoice_date = _parse_date(invoice_date_raw)

        doc_number = None
        if number_col and pd.notna(row[number_col]):
            doc_number = str(row[number_col]).strip()
            if doc_number.endswith(".0"):
                doc_number = doc_number[:-2]

        currency = "USD"
        if currency_col and pd.notna(row[currency_col]):
            currency = str(row[currency_col]).strip().upper()[:3] or "USD"

        customer_id = _customer_key(name, email)
        client_row = client_cache.get(customer_id)
        if client_row is None:
            client_row = (
                db.query(Client)
                .filter(Client.user_id == user_id, Client.qb_customer_id == customer_id)
                .one_or_none()
            )
            if client_row is None:
                client_row = Client(
                    user_id=user_id,
                    qb_customer_id=customer_id,
                    name=name,
                    email=email,
                )
                db.add(client_row)
                db.flush()
            else:
                client_row.name = name
                client_row.email = email
                if phone and import_whatsapp_phones and not client_row.phone:
                    client_row.phone = phone
            client_cache[customer_id] = client_row

        if doc_number:
            qb_invoice_id = f"csv:{doc_number}"[:64]
        else:
            qb_invoice_id = f"csv:{uuid.uuid4()}"

        existing = (
            db.query(Invoice)
            .filter(Invoice.user_id == user_id, Invoice.qb_invoice_id == qb_invoice_id)
            .one_or_none()
        )
        if existing is None and doc_number:
            qb_invoice_id = f"csv:{doc_number}:{idx}"[:64]
            existing = (
                db.query(Invoice)
                .filter(Invoice.user_id == user_id, Invoice.qb_invoice_id == qb_invoice_id)
                .one_or_none()
            )

        days_overdue, status = _invoice_status(due_date, balance)
        total_outstanding += balance
        now = datetime.now(UTC)

        invoice_phone = phone if import_whatsapp_phones else None

        if existing is None:
            invoice_row = Invoice(
                user_id=user_id,
                client_id=client_row.id,
                qb_invoice_id=qb_invoice_id,
                doc_number=doc_number,
                amount=amount,
                balance=balance,
                currency=currency,
                invoice_date=invoice_date,
                due_date=due_date,
                days_overdue=days_overdue,
                status=status,
                source="upload",
                imported_at=now,
                reminder_phone=invoice_phone,
            )
            db.add(invoice_row)
        else:
            existing.client_id = client_row.id
            existing.doc_number = doc_number
            existing.amount = amount
            existing.balance = balance
            existing.currency = currency
            existing.invoice_date = invoice_date
            existing.due_date = due_date
            existing.days_overdue = days_overdue
            existing.status = status
            existing.source = "upload"
            existing.imported_at = now
            if invoice_phone:
                existing.reminder_phone = invoice_phone

        imported += 1

    db.add(
        InvoiceImportBatch(
            user_id=user_id,
            filename=filename[:255],
            imported_count=imported,
            skipped_count=skipped,
            total_outstanding=float(total_outstanding),
            columns_found=json.dumps(list(raw_headers.values())),
        )
    )
    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "total_outstanding": float(total_outstanding),
        "columns_found": list(raw_headers.values()),
    }
