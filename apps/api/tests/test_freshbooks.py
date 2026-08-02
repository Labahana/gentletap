"""Unit tests for FreshBooks ID helpers and webhook signature verification."""

import base64
import hashlib
import hmac
import json

from gentletap.integrations.freshbooks.ids import (
    from_external_id,
    is_freshbooks_external_id,
    to_external_client_id,
    to_external_invoice_id,
)
from gentletap.integrations.freshbooks.webhooks import parse_form_body, verify_signature


def test_external_ids():
    assert to_external_invoice_id(42) == "fb:42"
    assert to_external_client_id("99") == "fb:99"
    assert from_external_id("fb:42") == "42"
    assert from_external_id("1042") is None
    assert is_freshbooks_external_id("fb:1")
    assert not is_freshbooks_external_id("csv:1")


def test_parse_form_body():
    body = b"name=invoice.create&object_id=123&account_id=zDmNq"
    assert parse_form_body(body) == {
        "name": "invoice.create",
        "object_id": "123",
        "account_id": "zDmNq",
    }


def test_verify_signature_matches_freshbooks_format():
    form = {"name": "invoice.create", "object_id": "123", "account_id": "abc"}
    verifier = "test-verifier-secret"
    payload = json.dumps({k: str(v) for k, v in form.items()}, separators=(", ", ": "))
    digest = hmac.new(verifier.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).digest()
    signature = base64.b64encode(digest).decode("utf-8")
    assert verify_signature(form, signature, verifier) is True
    assert verify_signature(form, "bad", verifier) is False
    assert verify_signature(form, signature, None) is False
