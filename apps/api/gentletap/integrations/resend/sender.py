"""Resend verified sender + send."""

from datetime import UTC, datetime

import httpx
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import EmailSender

RESEND_API = "https://api.resend.com"


def is_configured() -> bool:
    return bool(get_settings().resend_api_key)


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {get_settings().resend_api_key}",
        "Content-Type": "application/json",
    }


def start_sender_verification(db: Session, user_id, email_address: str) -> EmailSender:
    if not is_configured():
        raise ValueError("Resend is not configured")

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{RESEND_API}/senders",
            headers=_headers(),
            json={"email": email_address},
        )
        response.raise_for_status()
        payload = response.json()

    sender = (
        db.query(EmailSender)
        .filter(EmailSender.user_id == user_id, EmailSender.email_address == email_address)
        .one_or_none()
    )
    if sender is None:
        sender = EmailSender(user_id=user_id, email_address=email_address, provider="resend")
        db.add(sender)

    sender.resend_sender_id = str(payload.get("id", ""))
    sender.verification_status = "pending"
    sender.is_primary = True
    db.commit()
    db.refresh(sender)
    return sender


def refresh_sender_status(db: Session, sender: EmailSender) -> EmailSender:
    if not sender.resend_sender_id or not is_configured():
        return sender

    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{RESEND_API}/senders/{sender.resend_sender_id}",
            headers=_headers(),
        )
        if response.status_code == 404:
            return sender
        response.raise_for_status()
        payload = response.json()

    status = payload.get("status", "pending")
    sender.verification_status = "verified" if status == "verified" else status
    if sender.verification_status == "verified":
        sender.verified_at = datetime.now(UTC)
    db.commit()
    db.refresh(sender)
    return sender


def send_email(*, from_email: str, to: str, subject: str, body: str) -> str:
    if not is_configured():
        raise ValueError("Resend is not configured")

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{RESEND_API}/emails",
            headers=_headers(),
            json={
                "from": from_email,
                "to": [to],
                "subject": subject,
                "text": body,
            },
        )
        response.raise_for_status()
        return response.json().get("id", "")
