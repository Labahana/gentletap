"""Resend custom domain DNS setup."""

from datetime import UTC, datetime
import re
import uuid

import httpx
from sqlalchemy.orm import Session

from gentletap.database import EmailDomain
from gentletap.integrations.resend.sender import RESEND_API, _headers, is_configured

_DOMAIN_RE = re.compile(
    r"^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$",
    re.IGNORECASE,
)


def parse_domain_input(raw: str) -> str:
    value = raw.strip().lower()
    if "@" in value:
        value = value.split("@", 1)[1]
    if value.startswith("http://"):
        value = value[7:]
    if value.startswith("https://"):
        value = value[8:]
    value = value.split("/")[0].strip(".")
    if not _DOMAIN_RE.match(value):
        raise ValueError("Enter a valid company email or domain name")
    return value


def create_domain(db: Session, user_id: uuid.UUID, domain_name: str) -> EmailDomain:
    if not is_configured():
        raise ValueError("Resend is not configured")

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{RESEND_API}/domains",
            headers=_headers(),
            json={"name": domain_name},
        )
        if response.status_code >= 400:
            detail = response.json().get("message", response.text) if response.content else response.text
            raise ValueError(detail or "Could not register domain with Resend")
        payload = response.json()

    row = db.query(EmailDomain).filter(EmailDomain.user_id == user_id).one_or_none()
    if row is None:
        row = EmailDomain(user_id=user_id, domain=domain_name, resend_domain_id=str(payload.get("id", "")))
        db.add(row)
    else:
        row.domain = domain_name
        row.resend_domain_id = str(payload.get("id", ""))
        row.verification_status = _map_status(payload.get("status"))
        row.verified_at = None

    db.commit()
    db.refresh(row)
    return row


def _map_status(status: str | None) -> str:
    if status in ("verified",):
        return "verified"
    if status in ("failed",):
        return "failed"
    return "pending"


def refresh_domain(db: Session, row: EmailDomain) -> EmailDomain:
    if not row.resend_domain_id or not is_configured():
        return row

    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{RESEND_API}/domains/{row.resend_domain_id}",
            headers=_headers(),
        )
        if response.status_code == 404:
            return row
        response.raise_for_status()
        payload = response.json()

    row.verification_status = _map_status(payload.get("status"))
    if row.verification_status == "verified":
        row.verified_at = datetime.now(UTC)
    db.commit()
    db.refresh(row)
    return row


def verify_domain(db: Session, row: EmailDomain) -> EmailDomain:
    if not row.resend_domain_id or not is_configured():
        raise ValueError("Resend is not configured")

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            f"{RESEND_API}/domains/{row.resend_domain_id}/verify",
            headers=_headers(),
        )
        if response.status_code >= 400:
            detail = response.json().get("message", response.text) if response.content else response.text
            raise ValueError(detail or "Domain verification failed")
    return refresh_domain(db, row)


def fetch_domain_records(row: EmailDomain) -> list[dict]:
    if not row.resend_domain_id or not is_configured():
        return []

    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{RESEND_API}/domains/{row.resend_domain_id}",
            headers=_headers(),
        )
        if response.status_code == 404:
            return []
        response.raise_for_status()
        payload = response.json()

    records: list[dict] = []
    for item in payload.get("records") or []:
        records.append(
            {
                "type": item.get("type") or item.get("record") or "TXT",
                "host": item.get("name") or item.get("host") or "",
                "value": item.get("value") or "",
                "priority": item.get("priority"),
            }
        )
    return records


def delete_domain(db: Session, row: EmailDomain) -> None:
    if row.resend_domain_id and is_configured():
        with httpx.Client(timeout=30.0) as client:
            client.delete(
                f"{RESEND_API}/domains/{row.resend_domain_id}",
                headers=_headers(),
            )
    db.delete(row)
    db.commit()
