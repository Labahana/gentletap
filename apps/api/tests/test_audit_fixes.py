import pytest

from gentletap.config import Settings, validate_production_settings
from gentletap.integrations.meta.validation import validate_embedded_signup
from gentletap.services.whatsapp_inbound import handle_inbound_whatsapp


def test_inbound_rejects_unscoped_shared_number(db_session, monkeypatch):
    monkeypatch.setattr(
        "gentletap.services.whatsapp_inbound.resolve_user_id_for_to_phone",
        lambda _db, _to: None,
    )
    with pytest.raises(ValueError, match="Could not route"):
        handle_inbound_whatsapp(
            db_session,
            from_phone="+15551111111",
            to_phone="+15552222222",
            body="Paid already",
            external_sid="SM-test-unscoped",
            routed_via="shared_number",
        )


def test_meta_validation_requires_code_when_secret_configured():
    settings = Settings(meta_app_secret="test-secret", environment="development")
    with pytest.raises(ValueError, match="authorization code"):
        validate_embedded_signup(
            code=None,
            waba_id="123456789",
            phone_e164="+15551234567",
            settings=settings,
        )


def test_production_requires_meta_secret_for_own_number():
    settings = Settings(
        environment="production",
        secret_key="prod-secret-key-value",
        jwt_secret_key="prod-jwt-secret-key-value-min-32-chars",
        token_encryption_key="prod-token-encryption-key-value",
        meta_app_id="app-id",
        meta_embedded_signup_config_id="config-id",
        twilio_account_sid="AC123",
    )
    with pytest.raises(RuntimeError, match="META_APP_SECRET"):
        validate_production_settings(settings)
