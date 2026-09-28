import logging
import re
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
from app.services.html_email import text_to_html

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


def apply_signature(body: str, signature: Optional[str]) -> str:
    """Swap the draft's trailing sign-off for the org's configured signature.

    Only treats the final paragraph as a sign-off (and replaces it) when it's
    short — otherwise the signature is appended so real content is never lost.
    """
    sig = (signature or "").strip()
    if not sig:
        return body
    text = body.rstrip()
    if not text:
        return sig
    parts = text.split("\n\n")
    last = parts[-1]
    last_is_signoff = len(parts) >= 2 and last.count("\n") <= 1 and len(last) <= 60
    if last_is_signoff:
        parts = parts[:-1]
    return "\n\n".join(parts).rstrip() + "\n\n" + sig


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


def _from_with_display(from_header: str, display: Optional[str]) -> str:
    """Swap the display-name portion of a From header, keeping the verified address.

    Changing only the display name preserves SPF/DKIM (no domain verification
    needed) while making the email look like it came from the business.
    """
    if not display:
        return from_header
    m = re.search(r"<([^>]+)>", from_header or "")
    addr = m.group(1) if m else (from_header or "")
    safe_display = display.replace('"', "").strip() or "GentleTap"
    return f'"{safe_display}" <{addr}>'


def _org_sender_identity(db: Optional[Session], org_id: str) -> tuple:
    """Return (display_name, reply_to_email) for the org, best-effort."""
    if db is None:
        return None, None
    from app.models.organization import Organization
    from app.models.user import User

    org = db.query(Organization).filter(Organization.id == org_id).first()
    display = (org.name or "").strip() if org else None
    reply_to = None
    if org and org.owner_user_id:
        owner = db.query(User).filter(User.id == org.owner_user_id).first()
        reply_to = owner.email if owner else None
    return display, reply_to


def send_email_via_resend(
    to_email: str,
    subject: str,
    body: str,
    headers: Optional[Dict[str, str]] = None,
    from_email: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Deliver email via Resend SDK (GentleTap domain). Returns resend result dict.
    If API key is mock or resend package is not present, returns a success mock dictionary.
    """
    from_email = from_email or settings.auth_email_from or settings.resend_from_email
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
            "html": text_to_html(body),
        }
        if reply_to:
            params["reply_to"] = reply_to
        if headers:
            params["headers"] = headers
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
    thread: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Dual-channel email dispatcher:
    - send_via='gmail': Dispatch using user's connected Google/Gmail OAuth connection.
    - send_via='resend': Dispatch using GentleTap's default domain via Resend.

    `thread` carries RFC822 threading headers (message_id/in_reply_to/references)
    so reminders for one invoice group into a single conversation.
    """
    thread = thread or {}

    # Sender identity: business display name, replies land in the owner's inbox,
    # and a List-Unsubscribe header for one-click unsubscribe (RFC 8058 friendly).
    display, reply_to = _org_sender_identity(db, org_id)
    unsub_token = make_unsubscribe_token(org_id, to_email)
    unsubscribe_url = f"{settings.frontend_url.rstrip('/')}/unsubscribe?token={unsub_token}"
    base_from = settings.auth_email_from or settings.resend_from_email
    resend_from = _from_with_display(base_from, display)
    extra_headers = {"List-Unsubscribe": f"<{unsubscribe_url}>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"}

    if send_via == "gmail" and db is not None:
        from app.models.connection import Connection
        google_conn = db.query(Connection).filter(
            Connection.org_id == org_id,
            Connection.provider.in_(["gmail", "google"]),
            Connection.status == "active",
        ).first()

        if google_conn:
            try:
                from app.services.crypto import decrypt_secret

                return send_email_via_gmail(
                    access_token=decrypt_secret(google_conn.token_encrypted),
                    refresh_token=decrypt_secret(google_conn.refresh_token_encrypted),
                    to_email=to_email,
                    subject=subject,
                    body=body,
                    sender_email=google_conn.account_id or google_conn.realm_id,
                    thread=thread,
                    reply_to=reply_to,
                    unsubscribe_url=unsubscribe_url,
                )
            except Exception as e:
                logger.warning(f"Gmail send failed ({e}). Falling back to Resend domain.")

    # Default to Resend domain
    resend_headers = {**extra_headers, **{k: v for k, v in {
        "Message-ID": thread.get("message_id"),
        "In-Reply-To": thread.get("in_reply_to"),
        "References": thread.get("references"),
    }.items() if v}}
    return send_email_via_resend(
        to_email=to_email,
        subject=subject,
        body=body,
        headers=resend_headers,
        from_email=resend_from,
        reply_to=reply_to,
    )
