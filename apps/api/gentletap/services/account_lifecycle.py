"""Account deletion and GDPR data export."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import (
    AgentDecision,
    Client,
    EmailPreference,
    EmailDomain,
    EmailSender,
    FreshBooksConnection,
    GoogleConnection,
    Invoice,
    InvoiceImportBatch,
    Profile,
    QuickBooksConnection,
    RefreshToken,
    ReminderJob,
    ReminderMessage,
    SyncLog,
    UserNotification,
    WhatsappConnection,
    WhatsappFollowupJob,
    WhatsappInboundMessage,
)
from gentletap.integrations.google import oauth as google_oauth
from gentletap.integrations.quickbooks import oauth as qb_oauth
from gentletap.services.whatsapp_connection import disconnect as disconnect_whatsapp
from gentletap.utils.crypto import decrypt_token


def _revoke_google(connection: GoogleConnection) -> None:
    try:
        refresh = decrypt_token(connection.refresh_token_enc)
        if refresh:
            google_oauth.revoke_token(refresh)
        else:
            google_oauth.revoke_token(decrypt_token(connection.access_token_enc))
    except Exception:
        pass


def _revoke_quickbooks(connection: QuickBooksConnection) -> None:
    try:
        access_token = decrypt_token(connection.access_token_enc)
        qb_oauth.revoke_tokens(access_token)
    except Exception:
        pass


def delete_user_account(db: Session, user_id: UUID) -> None:
    user = db.query(Profile).filter(Profile.id == user_id).one_or_none()
    if user is None:
        return

    qb = (
        db.query(QuickBooksConnection)
        .filter(QuickBooksConnection.user_id == user_id, QuickBooksConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    if qb:
        _revoke_quickbooks(qb)
        qb.disconnected_at = datetime.now(UTC)

    fb = (
        db.query(FreshBooksConnection)
        .filter(FreshBooksConnection.user_id == user_id, FreshBooksConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    if fb:
        fb.disconnected_at = datetime.now(UTC)

    google = (
        db.query(GoogleConnection)
        .filter(GoogleConnection.user_id == user_id, GoogleConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    if google:
        _revoke_google(google)
        google.disconnected_at = datetime.now(UTC)

    disconnect_whatsapp(db, user_id)

    invoice_ids = [
        row[0]
        for row in db.query(Invoice.id).filter(Invoice.user_id == user_id).all()
    ]

    if invoice_ids:
        db.query(ReminderJob).filter(ReminderJob.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
        db.query(ReminderMessage).filter(ReminderMessage.invoice_id.in_(invoice_ids)).delete(
            synchronize_session=False
        )
        db.query(AgentDecision).filter(AgentDecision.invoice_id.in_(invoice_ids)).delete(synchronize_session=False)
        db.query(WhatsappFollowupJob).filter(WhatsappFollowupJob.invoice_id.in_(invoice_ids)).delete(
            synchronize_session=False
        )

    db.query(WhatsappFollowupJob).filter(WhatsappFollowupJob.user_id == user_id).delete(synchronize_session=False)
    db.query(WhatsappInboundMessage).filter(WhatsappInboundMessage.user_id == user_id).delete(
        synchronize_session=False
    )
    db.query(Invoice).filter(Invoice.user_id == user_id).delete(synchronize_session=False)
    db.query(InvoiceImportBatch).filter(InvoiceImportBatch.user_id == user_id).delete(
        synchronize_session=False
    )
    db.query(Client).filter(Client.user_id == user_id).delete(synchronize_session=False)
    db.query(UserNotification).filter(UserNotification.user_id == user_id).delete(synchronize_session=False)
    db.query(SyncLog).filter(SyncLog.user_id == user_id).delete(synchronize_session=False)
    db.query(QuickBooksConnection).filter(QuickBooksConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(FreshBooksConnection).filter(FreshBooksConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(GoogleConnection).filter(GoogleConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(WhatsappConnection).filter(WhatsappConnection.user_id == user_id).delete(synchronize_session=False)
    db.query(EmailSender).filter(EmailSender.user_id == user_id).delete(synchronize_session=False)
    db.query(EmailDomain).filter(EmailDomain.user_id == user_id).delete(synchronize_session=False)
    db.query(EmailPreference).filter(EmailPreference.user_id == user_id).delete(synchronize_session=False)
    db.query(RefreshToken).filter(RefreshToken.user_id == user_id).delete(synchronize_session=False)
    db.query(Profile).filter(Profile.id == user_id).delete(synchronize_session=False)
    db.commit()


def export_user_data(db: Session, user_id: UUID) -> dict:
    user = db.query(Profile).filter(Profile.id == user_id).one()
    clients = db.query(Client).filter(Client.user_id == user_id).all()
    invoices = db.query(Invoice).filter(Invoice.user_id == user_id).all()
    invoice_ids = [inv.id for inv in invoices]

    reminders: list[ReminderMessage] = []
    if invoice_ids:
        reminders = db.query(ReminderMessage).filter(ReminderMessage.invoice_id.in_(invoice_ids)).all()

    return {
        "exported_at": datetime.now(UTC).isoformat(),
        "profile": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "persona": user.persona,
            "plan": user.plan,
            "timezone": user.timezone,
            "onboarding_completed_at": user.onboarding_completed_at.isoformat()
            if user.onboarding_completed_at
            else None,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "clients": [
            {
                "id": str(c.id),
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "avg_days_to_pay": float(c.avg_days_to_pay) if c.avg_days_to_pay is not None else None,
                "late_payment_rate": float(c.late_payment_rate),
                "lifetime_value": float(c.lifetime_value),
                "preferred_channel": c.preferred_channel,
            }
            for c in clients
        ],
        "invoices": [
            {
                "id": str(inv.id),
                "client_id": str(inv.client_id),
                "doc_number": inv.doc_number,
                "amount": float(inv.amount),
                "balance": float(inv.balance),
                "currency": inv.currency,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "status": inv.status,
                "paid_at": inv.paid_at.isoformat() if inv.paid_at else None,
            }
            for inv in invoices
        ],
        "reminders": [
            {
                "id": str(r.id),
                "invoice_id": str(r.invoice_id),
                "sequence_step": r.sequence_step,
                "subject": r.subject,
                "body": r.body,
                "channel": r.channel,
                "status": r.status,
                "sent_at": r.sent_at.isoformat() if r.sent_at else None,
            }
            for r in reminders
        ],
        "integrations": {
            "quickbooks_connected": db.query(QuickBooksConnection)
            .filter(QuickBooksConnection.user_id == user_id, QuickBooksConnection.disconnected_at.is_(None))
            .count()
            > 0,
            "freshbooks_connected": db.query(FreshBooksConnection)
            .filter(FreshBooksConnection.user_id == user_id, FreshBooksConnection.disconnected_at.is_(None))
            .count()
            > 0,
            "google_connected": db.query(GoogleConnection)
            .filter(GoogleConnection.user_id == user_id, GoogleConnection.disconnected_at.is_(None))
            .count()
            > 0,
            "whatsapp_connected": db.query(WhatsappConnection)
            .filter(WhatsappConnection.user_id == user_id, WhatsappConnection.disconnected_at.is_(None))
            .count()
            > 0,
        },
    }
