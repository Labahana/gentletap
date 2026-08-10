"""FreshBooks webhook verification and event handling."""

import base64
import hashlib
import hmac
import json
import logging
from decimal import Decimal
from urllib.parse import parse_qs

from sqlalchemy.orm import Session

from gentletap.database import FreshBooksConnection, IntegrationWebhookEvent
from gentletap.integrations.freshbooks import client as fb_client
from gentletap.integrations.freshbooks.ids import to_external_invoice_id
from gentletap.integrations.freshbooks.oauth import refresh_connection_tokens
from gentletap.services.payments import apply_invoice_balance_update
from gentletap.utils.crypto import decrypt_token, encrypt_token

logger = logging.getLogger(__name__)


def verify_signature(form_params: dict[str, str], signature: str | None, verifier: str | None) -> bool:
    """Validate X-FreshBooks-Hmac-SHA256 using the webhook verifier secret.

    FreshBooks signs a UTF-8 JSON string of the form params (all values as strings),
    with spaces after ':' and ',' — matching Python json.dumps defaults.
    """
    if not signature or not verifier:
        return False
    payload = json.dumps({k: str(v) for k, v in form_params.items()}, separators=(", ", ": "))
    digest = hmac.new(verifier.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected, signature)


def parse_form_body(body: bytes) -> dict[str, str]:
    parsed = parse_qs(body.decode("utf-8"), keep_blank_values=True)
    return {key: (values[0] if values else "") for key, values in parsed.items()}


def _claim_event(db: Session, event_key: str) -> bool:
    if not event_key:
        return True
    if (
        db.query(IntegrationWebhookEvent)
        .filter(IntegrationWebhookEvent.event_key == event_key)
        .one_or_none()
    ):
        return False
    db.add(IntegrationWebhookEvent(event_key=event_key))
    db.flush()
    return True


def handle_webhook_post(
    db: Session,
    *,
    form: dict[str, str],
    signature: str | None,
) -> dict:
    """Handle verification handshake and event deliveries."""
    # Verification handshake: FreshBooks POSTs a verifier + callback id.
    verifier = form.get("verifier")
    callback_id = form.get("callback_id") or form.get("object_id")
    account_id = form.get("account_id")
    name = form.get("name") or ""

    # Handshake may omit name or send callback.verify (FreshBooks docs / AsyncAPI).
    is_verify_handshake = bool(verifier and callback_id) and (
        not name or name.startswith("callback")
    )
    if is_verify_handshake:
        candidates = (
            db.query(FreshBooksConnection)
            .filter(FreshBooksConnection.disconnected_at.is_(None))
            .all()
        )
        if account_id:
            candidates = [c for c in candidates if c.account_id == account_id]
        for connection in candidates:
            try:
                fb_client.verify_webhook_callback(db, connection, int(callback_id), verifier)
                connection.webhook_verifier_enc = encrypt_token(verifier)
                db.commit()
                return {"status": "verified"}
            except Exception:
                db.rollback()
                continue
        logger.warning("FreshBooks webhook verification failed for callback %s", callback_id)
        return {"status": "verification_failed"}

    connection = None
    if account_id:
        connection = (
            db.query(FreshBooksConnection)
            .filter(
                FreshBooksConnection.account_id == account_id,
                FreshBooksConnection.disconnected_at.is_(None),
            )
            .one_or_none()
        )
    if connection is None:
        return {"status": "ignored"}

    stored_verifier = None
    if connection.webhook_verifier_enc:
        try:
            stored_verifier = decrypt_token(connection.webhook_verifier_enc)
        except Exception:
            stored_verifier = None

    # Require the verifier from the handshake — unsigned events could otherwise
    # mark invoices paid and trigger false "payment received" notifications.
    if not stored_verifier or not verify_signature(form, signature, stored_verifier):
        return {"status": "invalid_signature"}

    object_id = form.get("object_id")
    if not name or not object_id:
        return {"status": "ignored"}

    # FreshBooks includes a unique event_id per delivery; without it, an
    # entity-only key would drop every repeat update to the same entity forever.
    delivery_id = form.get("event_id") or hashlib.sha256(
        json.dumps(form, sort_keys=True).encode("utf-8")
    ).hexdigest()
    event_key = f"fb:{account_id}:{name}:{object_id}:{delivery_id}"
    if not _claim_event(db, event_key):
        db.commit()
        return {"status": "duplicate"}

    try:
        if name.startswith("invoice"):
            _handle_invoice_event(db, connection, object_id)
        elif name.startswith("payment"):
            _handle_payment_event(db, connection, object_id)
        elif name.startswith("client"):
            # Client changes are picked up on next invoice sync / invoice event.
            pass
        db.commit()
    except Exception:
        logger.exception("FreshBooks webhook handler failed for %s", event_key)
        db.rollback()
        # Transient processing error — FreshBooks must retry rather than assume delivery.
        return {"status": "processing_error"}

    return {"status": "ok"}


def _outstanding_balance(invoice) -> Decimal:
    outstanding = getattr(invoice, "outstanding", None)
    if outstanding is None:
        return Decimal("0")
    if hasattr(outstanding, "data") and isinstance(outstanding.data, dict):
        return Decimal(str(outstanding.data.get("amount", 0) or 0))
    if isinstance(outstanding, dict):
        return Decimal(str(outstanding.get("amount", 0) or 0))
    return Decimal(str(outstanding or 0))


def _handle_invoice_event(db: Session, connection: FreshBooksConnection, invoice_id: str) -> None:
    invoice = fb_client.get_invoice(db, connection, invoice_id)
    if invoice is None:
        # 404 means deleted/not-found — NOT paid. Marking balance 0 here would
        # fire a false "payment received" and stop live reminders. Skip; the next
        # sync reconciles deletions explicitly.
        logger.warning(
            "FreshBooks invoice %s not found on webhook; leaving balance unchanged", invoice_id
        )
        return
    balance = _outstanding_balance(invoice)
    apply_invoice_balance_update(
        db,
        user_id=connection.user_id,
        qb_invoice_id=to_external_invoice_id(invoice_id),
        balance=balance,
        notify=balance <= 0,
    )


def _handle_payment_event(db: Session, connection: FreshBooksConnection, payment_id: str) -> None:
    payment = fb_client.get_payment(db, connection, payment_id)
    if payment is None:
        return
    invoice_id = getattr(payment, "invoiceid", None)
    if not invoice_id:
        return
    invoice = fb_client.get_invoice(db, connection, invoice_id)
    if invoice is None:
        return
    balance = _outstanding_balance(invoice)
    apply_invoice_balance_update(
        db,
        user_id=connection.user_id,
        qb_invoice_id=to_external_invoice_id(invoice_id),
        balance=balance,
        notify=balance <= 0,
    )


def ensure_connection_tokens(db: Session, connection: FreshBooksConnection) -> None:
    """Best-effort proactive refresh used by long-lived workers."""
    refresh_connection_tokens(db, connection)
