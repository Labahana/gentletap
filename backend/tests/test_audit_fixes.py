"""Regression tests for the full-app audit fixes (criticals + high/medium)."""

import os
import sys
from unittest.mock import MagicMock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")

import pytest
from fastapi import HTTPException

from app.services import webhook_security
from app.api.deps import create_refresh_token, create_access_token, get_current_user_and_org
from app.api import health as health_mod


def test_svix_fails_closed_when_secret_missing():
    # Previously returned True (accepting forged Resend events) when unset.
    assert webhook_security.verify_svix(
        "", b"{}", msg_id="msg_1", timestamp="0", signature="v1,deadbeef"
    ) is False


def test_twilio_fails_closed_when_token_missing(monkeypatch):
    monkeypatch.setattr(
        webhook_security, "get_settings",
        lambda: MagicMock(twilio_auth_token=""),
    )
    assert webhook_security.verify_twilio("https://x", {"Body": "STOP"}, "sig") is False


def test_refresh_token_is_rejected_by_auth_dependency():
    # A refresh token must NOT be usable as an access token (C5).
    token = create_refresh_token("user-1", "org-1")
    db = MagicMock()
    with pytest.raises(HTTPException) as exc:
        get_current_user_and_org(token=token, db=db)
    assert exc.value.status_code == 401
    db.query.assert_not_called()


def test_access_token_passes_type_gate():
    # Sanity: an access token clears the type check and proceeds to the DB lookup.
    token = create_access_token("user-1", "org-1", "a@b.com")
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None  # -> 401 User not found
    with pytest.raises(HTTPException) as exc:
        get_current_user_and_org(token=token, db=db)
    assert exc.value.status_code == 401
    assert exc.value.detail == "User not found"


def test_public_health_endpoints_do_not_leak_detail(monkeypatch):
    # Error details (which can embed the DB DSN) must never reach anonymous callers.
    monkeypatch.setattr(
        health_mod, "check_db",
        lambda: {"status": "error", "detail": "postgresql+psycopg2://u:PWN@host/db"},
    )
    out = health_mod.health_db()
    assert out == {"status": "error"}
    assert "detail" not in out

    monkeypatch.setattr(
        health_mod, "check_celery",
        lambda: {"status": "ok", "workers": ["w1"]},
    )
    assert health_mod.health_celery() == {"status": "ok", "workers": ["w1"]}


def test_admin_emails_default_is_empty():
    # A hardcoded default admin email would let anyone who registers that address
    # pass the email-based admin gate. Default must be empty / fail-closed.
    from app.config import Settings

    s = Settings(_env_file=None)
    assert s.admin_emails == []
