"""Deliver reminders via email (Gmail/Resend) or WhatsApp templates (Pro+)."""

from sqlalchemy.orm import Session

from gentletap.database import EmailDomain, EmailPreference, EmailSender, GoogleConnection, Invoice, Profile, ReminderMessage
from gentletap.integrations.google import oauth as google_oauth
from gentletap.integrations.resend import sender as resend_sender
from gentletap.integrations.twilio import templates as wa_templates
from gentletap.integrations.twilio import whatsapp as twilio_whatsapp
from gentletap.intelligence.schemas import Channel
from gentletap.plans import has_whatsapp
from gentletap.services.context_builder import build_reminder_context
from gentletap.services.email_platform import domain_from_preview, platform_from_address
from gentletap.services.email_templates import ReminderEmailData, build_reminder_bodies
from gentletap.services.whatsapp_connection import resolve_twilio_credentials, resolve_whatsapp_from
from gentletap.services.whatsapp_usage import get_active_connection


def get_send_provider(db: Session, user_id) -> str | None:
    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user_id).one_or_none()
    if pref:
        return pref.send_provider

    google = (
        db.query(GoogleConnection)
        .filter(GoogleConnection.user_id == user_id, GoogleConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    if google:
        return "google"

    verified = (
        db.query(EmailSender)
        .filter(
            EmailSender.user_id == user_id,
            EmailSender.verification_status == "verified",
            EmailSender.is_primary.is_(True),
        )
        .one_or_none()
    )
    if verified:
        return "resend"
    return None


def has_delivery_capability(db: Session, user_id, *, plan: str = "free") -> bool:
    if get_send_provider(db, user_id):
        return True
    if has_whatsapp(plan) and get_active_connection(db, user_id) and twilio_whatsapp.is_configured():
        return True
    return False


def _business_name(profile: Profile) -> str:
    return (
        (profile.company_name or profile.email_display_name or profile.full_name or "").strip()
        or profile.email.split("@")[0]
    )


def _prepare_reminder_email(
    db: Session,
    user_id,
    message: ReminderMessage,
    profile: Profile,
) -> tuple[str, str | None]:
    """Build multipart plain + HTML bodies for a reminder email."""
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == message.invoice_id, Invoice.user_id == user_id)
        .one_or_none()
    )
    if invoice is None:
        return message.body, None

    data = ReminderEmailData(
        doc_number=(invoice.doc_number or "").strip() or "invoice",
        balance=float(invoice.balance),
        currency=invoice.currency or "USD",
        client_name=invoice.client.name if invoice.client else "",
        business_name=_business_name(profile),
        contact_email=profile.email,
        contact_phone=(profile.phone or "").strip() or None,
        payment_link=(invoice.payment_link or "").strip() or None,
    )
    plain, html = build_reminder_bodies(data, message.body)
    return plain, html


def send_reminder_message(
    db: Session,
    user_id,
    message: ReminderMessage,
    *,
    channel: Channel,
    to_email: str | None = None,
    to_phone: str | None = None,
) -> str:
    if channel == Channel.WHATSAPP:
        return send_whatsapp_reminder(
            db,
            user_id,
            message,
            to_phone=to_phone or "",
            sequence_step=message.sequence_step,
            tone=message.tone,
        )

    if not to_email:
        raise ValueError("Client email required")
    provider = get_send_provider(db, user_id)
    if provider is None:
        raise ValueError("No email provider connected — connect Gmail or verify a sender")

    subject = message.subject or "Invoice reminder"
    sender = db.query(Profile).filter(Profile.id == user_id).one_or_none()
    body, html = _prepare_reminder_email(db, user_id, message, sender) if sender else (message.body, None)

    if provider == "google":
        connection = (
            db.query(GoogleConnection)
            .filter(GoogleConnection.user_id == user_id, GoogleConnection.disconnected_at.is_(None))
            .one_or_none()
        )
        if connection is None:
            raise ValueError("Gmail not connected")
        from_name = None
        reply_to = None
        if sender:
            from_name = (
                (sender.email_display_name or sender.company_name or sender.full_name or "").strip()
                or None
            )
            reply_to = sender.email
        external_id = google_oauth.send_email(
            db,
            connection,
            to=to_email,
            subject=subject,
            body=body,
            from_name=from_name,
            reply_to=reply_to,
            html=html,
        )
        message.send_provider = "google"
        message.channel = "email"
        return external_id

    if provider == "platform":
        user = db.query(Profile).filter(Profile.id == user_id).one()
        external_id = resend_sender.send_email(
            from_email=platform_from_address(user),
            to=to_email,
            subject=subject,
            body=body,
            reply_to=user.email,
            html=html,
        )
        message.send_provider = "platform"
        message.channel = "email"
        return external_id

    if provider == "resend":
        user = db.query(Profile).filter(Profile.id == user_id).one()
        domain_row = db.query(EmailDomain).filter(EmailDomain.user_id == user_id).one_or_none()
        if domain_row and domain_row.verification_status == "verified":
            external_id = resend_sender.send_email(
                from_email=domain_from_preview(user, domain_row.domain),
                to=to_email,
                subject=subject,
                body=body,
                reply_to=user.email,
                html=html,
            )
            message.send_provider = "resend"
            message.channel = "email"
            return external_id

    verified_sender = (
        db.query(EmailSender)
        .filter(
            EmailSender.user_id == user_id,
            EmailSender.verification_status == "verified",
            EmailSender.is_primary.is_(True),
        )
        .one_or_none()
    )
    if verified_sender is None:
        raise ValueError("No verified Resend sender")
    external_id = resend_sender.send_email(
        from_email=verified_sender.email_address,
        to=to_email,
        subject=subject,
        body=body,
        html=html,
    )
    message.send_provider = "resend"
    message.channel = "email"
    return external_id


def send_whatsapp_reminder(
    db: Session,
    user_id,
    message: ReminderMessage,
    *,
    to_phone: str,
    sequence_step: int,
    tone: str | None,
) -> str:
    if not to_phone:
        raise ValueError("Client phone number required for WhatsApp")

    ctx = build_reminder_context(db, message.invoice_id, user_id)
    if ctx is None:
        raise ValueError("Invoice context not found")

    user = db.query(Profile).filter(Profile.id == user_id).one()
    sender_name = ctx.sender_name or (user.full_name or user.email.split("@")[0])
    payload = wa_templates.build_payload(
        ctx,
        sender_name=sender_name,
        sequence_step=sequence_step,
        tone=tone,
    )
    from_number = resolve_whatsapp_from(db, user_id)
    if not from_number:
        raise ValueError("WhatsApp is not connected")

    account_sid, auth_token, from_number = resolve_twilio_credentials(db, user_id)
    external_id = twilio_whatsapp.send_whatsapp_template(
        to_phone=to_phone,
        content_sid=payload.content_sid,
        content_variables=payload.variables,
        from_number=from_number,
        account_sid=account_sid,
        auth_token=auth_token,
    )
    message.send_provider = "twilio"
    message.channel = "whatsapp"
    message.subject = f"WhatsApp · {payload.template_key}"
    message.body = payload.preview_body
    return external_id
