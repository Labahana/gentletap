import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

import jwt
from sqlalchemy.orm import Session

try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    resend = None
    RESEND_AVAILABLE = False

from app.config import get_settings
from app.services.google_gmail import send_email_via_gmail

logger = logging.getLogger(__name__)
settings = get_settings()

if RESEND_AVAILABLE and resend:
    resend.api_key = settings.resend_api_key


def render_template_placeholders(template_str: str, context: Dict[str, Any]) -> str:
    """
    Interpolate variables into subject/body templates:
    {client_name}, {invoice_number}, {amount}, {due_date}, {days_overdue}
    """
    result = template_str

    raw_amt = context.get("amount")
    formatted_amt = "$0.00"
    if raw_amt is not None:
        try:
            val = float(raw_amt)
            formatted_amt = f"${val:,.2f}"
        except (ValueError, TypeError):
            formatted_amt = str(raw_amt)

    replacements = {
        "{client_name}": str(context.get("client_name") or "Valued Client"),
        "{invoice_number}": str(context.get("invoice_number") or "N/A"),
        "{amount}": formatted_amt,
        "{due_date}": str(context.get("due_date") or "due date"),
        "{days_overdue}": str(context.get("days_overdue") or 0),
    }

    for key, val in replacements.items():
        result = result.replace(key, val)

    return result


def make_unsubscribe_token(org_id: str, email: str) -> str:
    payload = {
        "org_id": org_id,
        "email": email.lower(),
        "purpose": "unsubscribe",
        "exp": datetime.now(timezone.utc).timestamp() + 60 * 60 * 24 * 365,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_unsubscribe_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def append_opt_out_footer(body: str, org_id: str, email: str) -> str:
    token = make_unsubscribe_token(org_id, email)
    link = f"{settings.frontend_url.rstrip('/')}/unsubscribe?token={token}"
    return (
        f"{body.rstrip()}\n\n"
        f"---\n"
        f"Don't want these reminders? Unsubscribe: {link}"
    )


def apply_resend_event_to_message(msg, event_type: str, now=None) -> bool:
    """Update message row from a Resend webhook event. Returns True if updated."""
    now = now or datetime.now(timezone.utc)
    if event_type == "email.delivered":
        msg.status = "delivered"
        msg.delivered_at = now
    elif event_type == "email.opened":
        msg.status = "opened"
        msg.opened_at = now
    elif event_type == "email.clicked":
        msg.status = "clicked"
        msg.clicked_at = now
    elif event_type == "email.bounced":
        msg.status = "bounced"
    elif event_type == "email.failed":
        msg.status = "failed"
    else:
        return False
    return True


def send_email_via_resend(to_email: str, subject: str, body: str) -> Dict[str, Any]:
    """
    Deliver email via Resend SDK (GentleTap domain). Returns resend result dict.
    If API key is mock or resend package is not present, returns a success mock dictionary.
    """
    from_email = settings.auth_email_from or settings.resend_from_email
    if not RESEND_AVAILABLE or not settings.resend_api_key or settings.resend_api_key.startswith("re_mock"):
        logger.info(f"[MOCK RESEND EMAIL SENT] To: {to_email} | Subject: {subject} | From: {from_email}")
        return {
            "id": f"mock_msg_{to_email.replace('@', '_')}",
            "from": from_email,
            "to": to_email,
            "status": "sent",
            "provider": "resend",
        }

    try:
        params = {
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "html": f"<div style='font-family: sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6;'>{body.replace(chr(10), '<br/>')}</div>",
        }
        res = resend.Emails.send(params)
        res["provider"] = "resend"
        return res
    except Exception as e:
        logger.error(f"Resend email error: {e}")
        raise e


def send_email_dispatch(
    org_id: str,
    to_email: str,
    subject: str,
    body: str,
    send_via: str = "resend",
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Dual-channel email dispatcher:
    - send_via='gmail': Dispatch using user's connected Google/Gmail OAuth connection.
    - send_via='resend': Dispatch using GentleTap's default domain via Resend.
    """
    if send_via == "gmail" and db is not None:
        from app.models.connection import Connection
        google_conn = db.query(Connection).filter(
            Connection.org_id == org_id,
            Connection.provider.in_(["gmail", "google"]),
            Connection.status == "active",
        ).first()

        if google_conn:
            try:
                return send_email_via_gmail(
                    access_token=google_conn.token_encrypted,
                    refresh_token=google_conn.refresh_token_encrypted,
                    to_email=to_email,
                    subject=subject,
                    body=body,
                    sender_email=google_conn.account_id or google_conn.realm_id,
                )
            except Exception as e:
                logger.warning(f"Gmail send failed ({e}). Falling back to Resend domain.")

    # Default to Resend domain
    return send_email_via_resend(to_email=to_email, subject=subject, body=body)
