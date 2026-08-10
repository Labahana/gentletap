"""QuickBooks webhook signature verification and event handling."""

import base64
import hashlib
import hmac
import json
from decimal import Decimal

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import IntegrationWebhookEvent, QuickBooksConnection
from gentletap.integrations.quickbooks import client as qb_client
from gentletap.integrations.quickbooks.invoice_fields import payment_link_from_qb
from gentletap.services.payments import apply_invoice_balance_update
from gentletap.services.webhook_claims import claim_integration_event


def verify_signature(payload: bytes, signature: str | None) -> bool:
    token = get_settings().intuit_webhook_verifier_token
    if not token or not signature:
        return False
    digest = hmac.new(token.encode(), payload, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode()
    return hmac.compare_digest(expected, signature)


def normalize_payload(payload: dict) -> list[dict]:
    """Support legacy eventNotifications and CloudEvents (Intuit 2026+)."""
    if payload.get("eventNotifications"):
        return payload["eventNotifications"]

    if payload.get("specversion") == "1.0":
        data = payload.get("data") or {}
        realm_id = data.get("accountId") or data.get("realmId")
        entities = data.get("entities") or []
        if not entities and payload.get("type"):
            entity_type = payload["type"].split(".")[-1].replace("updated", "").replace("created", "")
            entity_map = {"invoice": "Invoice", "payment": "Payment"}
            name = entity_map.get(entity_type.lower())
            entity_id = data.get("id") or data.get("entityId")
            if name and entity_id:
                entities = [{"name": name, "id": str(entity_id)}]
        if realm_id and entities:
            return [{"realmId": str(realm_id), "dataChangeEvent": {"entities": entities}}]
    return []


def _claim_event(db: Session, event_key: str) -> bool:
    return claim_integration_event(db, event_key)


def handle_webhook_event(db: Session, payload: dict) -> None:
    cloud_event_id = str(payload.get("id") or "")
    for notification in normalize_payload(payload):
        realm_id = notification.get("realmId")
        if not realm_id:
            continue
        connection = (
            db.query(QuickBooksConnection)
            .filter(
                QuickBooksConnection.realm_id == str(realm_id),
                QuickBooksConnection.disconnected_at.is_(None),
            )
            .one_or_none()
        )
        if connection is None:
            continue

        for entity in notification.get("dataChangeEvent", {}).get("entities", []):
            name = entity.get("name")
            entity_id = entity.get("id")
            if not entity_id:
                continue
            if cloud_event_id:
                # A single CloudEvent id wraps a batch of entities — key per entity
                # so a Payment arriving with an Invoice (or two invoices) in one
                # delivery doesn't silently drop every entity after the first.
                event_key = f"{cloud_event_id}:{name}:{entity_id}"
            else:
                # Legacy payloads carry no unique delivery id — an entity-only key
                # would drop every future update to the same entity. Use the
                # entity's lastUpdated (or the whole notification) to distinguish
                # genuinely new events from identical retries.
                discriminator = entity.get("lastUpdated") or hashlib.sha256(
                    json.dumps(notification, sort_keys=True).encode("utf-8")
                ).hexdigest()
                event_key = f"qb:{realm_id}:{name}:{entity_id}:{discriminator}"
            if not _claim_event(db, event_key):
                continue
            if name == "Invoice":
                _handle_invoice_event(db, connection, entity_id)
            elif name == "Payment":
                _handle_payment_event(db, connection, entity_id)
        db.commit()


def _qb_entity_id(entity_id: str) -> str | None:
    value = str(entity_id).strip()
    return value if value.isdigit() else None


def _handle_invoice_event(db: Session, connection: QuickBooksConnection, invoice_id: str) -> None:
    safe_id = _qb_entity_id(invoice_id)
    if not safe_id:
        return
    rows = qb_client.query(
        db,
        connection,
        f"SELECT * FROM Invoice WHERE Id = '{safe_id}'",
    )
    if not rows:
        return
    row = rows[0]
    balance = Decimal(str(row.get("Balance", 0)))
    apply_invoice_balance_update(
        db,
        user_id=connection.user_id,
        qb_invoice_id=str(invoice_id),
        balance=balance,
        notify=balance <= 0,
        payment_link=payment_link_from_qb(row),
        sync_payment_link=True,
    )


def _handle_payment_event(db: Session, connection: QuickBooksConnection, payment_id: str) -> None:
    safe_payment_id = _qb_entity_id(payment_id)
    if not safe_payment_id:
        return
    rows = qb_client.query(
        db,
        connection,
        f"SELECT * FROM Payment WHERE Id = '{safe_payment_id}'",
    )
    if not rows:
        return
    payment = rows[0]
    for line in payment.get("Line", []) or []:
        linked = line.get("LinkedTxn", [])
        for link in linked:
            if link.get("TxnType") == "Invoice":
                safe_inv_id = _qb_entity_id(link.get("TxnId", ""))
                if not safe_inv_id:
                    continue
                inv_rows = qb_client.query(
                    db,
                    connection,
                    f"SELECT * FROM Invoice WHERE Id = '{safe_inv_id}'",
                )
                if inv_rows:
                    balance = Decimal(str(inv_rows[0].get("Balance", 0)))
                    apply_invoice_balance_update(
                        db,
                        user_id=connection.user_id,
                        qb_invoice_id=str(link["TxnId"]),
                        balance=balance,
                        notify=balance <= 0,
                    )
