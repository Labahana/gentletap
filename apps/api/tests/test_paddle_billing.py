import hashlib
import hmac
import time

import pytest

from gentletap.config import Settings
from gentletap.integrations.paddle import billing as paddle_billing
from gentletap.integrations.paddle import webhooks as paddle_webhooks


def _settings(**overrides) -> Settings:
    base = dict(
        paddle_environment="sandbox",
        paddle_client_token="test_token_123",
        paddle_price_id_pro_monthly="pri_pro_m",
        paddle_price_id_pro_annual="pri_pro_y",
        paddle_price_id_pro_plus_monthly="pri_plus_m",
        paddle_price_id_team_monthly="pri_team_m",
    )
    base.update(overrides)
    return Settings(**base)


def test_public_config_exposes_token_and_env():
    cfg = paddle_billing.public_config(_settings())
    assert cfg == {"client_token": "test_token_123", "environment": "sandbox"}


def test_public_config_production_env():
    cfg = paddle_billing.public_config(_settings(paddle_environment="production"))
    assert cfg["environment"] == "production"


def test_checkout_result_prefers_transaction_id_and_url():
    result = paddle_billing._checkout_result(
        {"id": "txn_123", "checkout": {"url": "https://pay.paddle.com/x"}}
    )
    assert result == {"transaction_id": "txn_123", "checkout_url": "https://pay.paddle.com/x"}


def test_checkout_result_allows_overlay_only_transaction():
    result = paddle_billing._checkout_result({"id": "txn_abc", "checkout": {}})
    assert result["transaction_id"] == "txn_abc"
    assert result["checkout_url"] == ""


def test_checkout_result_raises_when_empty():
    with pytest.raises(ValueError):
        paddle_billing._checkout_result({"checkout": {}})


def test_price_id_for_falls_back_to_legacy_pro_price():
    settings = _settings(paddle_price_id_pro_monthly="", paddle_price_id_pro="pri_legacy")
    assert paddle_billing.price_id_for(settings, "pro", "month") == "pri_legacy"


def test_resolve_plan_picks_highest_rank():
    settings = _settings()
    sub = {"items": [{"price_id": "pri_pro_m"}, {"price_id": "pri_plus_m"}]}
    assert paddle_billing.resolve_plan_from_subscription(sub, settings) == "pro_plus"


def test_verify_signature_accepts_valid_hmac(monkeypatch):
    secret = "pdl_ntfset_secret"
    monkeypatch.setattr(
        paddle_webhooks, "get_settings", lambda: _settings(paddle_webhook_secret=secret)
    )
    payload = b'{"event_type":"subscription.updated"}'
    ts = str(int(time.time()))
    signed = f"{ts}:{payload.decode()}".encode()
    h1 = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    assert paddle_webhooks.verify_signature(payload, f"ts={ts};h1={h1}") is True


def test_verify_signature_rejects_tampered_payload(monkeypatch):
    secret = "pdl_ntfset_secret"
    monkeypatch.setattr(
        paddle_webhooks, "get_settings", lambda: _settings(paddle_webhook_secret=secret)
    )
    ts = str(int(time.time()))
    bad = hmac.new(secret.encode(), b"x", hashlib.sha256).hexdigest()
    assert paddle_webhooks.verify_signature(b"{}", f"ts={ts};h1={bad}") is False


def test_verify_signature_rejects_stale_timestamp(monkeypatch):
    secret = "pdl_ntfset_secret"
    monkeypatch.setattr(
        paddle_webhooks, "get_settings", lambda: _settings(paddle_webhook_secret=secret)
    )
    payload = b"{}"
    ts = str(int(time.time()) - 10_000)
    signed = f"{ts}:{payload.decode()}".encode()
    h1 = hmac.new(secret.encode(), signed, hashlib.sha256).hexdigest()
    assert paddle_webhooks.verify_signature(payload, f"ts={ts};h1={h1}") is False
