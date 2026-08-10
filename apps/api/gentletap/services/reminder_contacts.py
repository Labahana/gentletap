"""Per-invoice reminder contact resolution (email + WhatsApp phone)."""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice
from gentletap.integrations.twilio.phone import normalize_phone_e164


def effective_reminder_email(inv: Invoice, client: Client | None = None) -> str | None:
    row = client or inv.client
    if not row or not row.email:
        return None
    email = row.email.strip()
    return email if email and "@" in email else None


def effective_reminder_phone(inv: Invoice, client: Client | None = None) -> str | None:
    """WhatsApp uses only the number added on this invoice — never QB/client fallback."""
    raw = (inv.reminder_phone or "").strip()
    if not raw:
        return None
    return normalize_phone_e164(raw)


def whatsapp_send_allowed(inv: Invoice, client: Client | None = None) -> bool:
    """False when the client has replied STOP (or a synonym) — TCPA/Twilio opt-out."""
    c = client or inv.client
    return not bool(c and c.whatsapp_opted_out)


def reminder_contact_payload(inv: Invoice) -> dict:
    phone = effective_reminder_phone(inv)
    return {
        "reminder_phone": inv.reminder_phone,
        "client_phone": inv.client.phone if inv.client else None,
        "effective_reminder_phone": phone,
        "whatsapp_phone_missing": phone is None,
    }


def update_invoice_contacts(
    db: Session,
    inv: Invoice,
    *,
    reminder_phone: str | None = None,
    clear_reminder_phone: bool = False,
    client_email: str | None = None,
) -> Invoice:
    if clear_reminder_phone:
        inv.reminder_phone = None
    elif reminder_phone is not None:
        stripped = reminder_phone.strip()
        if not stripped:
            inv.reminder_phone = None
        else:
            normalized = normalize_phone_e164(stripped)
            if not normalized:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enter a valid mobile number with country code (e.g. +1 555 123 4567)",
                )
            inv.reminder_phone = normalized

    if client_email is not None:
        if not inv.client:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Client not found")
        email = client_email.strip()
        if not email or "@" not in email:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address")
        inv.client.email = email[:320]

    db.commit()
    db.refresh(inv)
    return inv
