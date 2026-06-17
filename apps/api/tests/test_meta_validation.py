from gentletap.config import Settings
from gentletap.integrations.meta.validation import validate_embedded_signup


def test_meta_validation_skipped_without_app_secret():
    settings = Settings(meta_app_secret="")
    validate_embedded_signup(
        code=None,
        waba_id="123456789",
        phone_e164="+15551234567",
        settings=settings,
    )


def test_meta_validation_requires_code_when_secret_set():
    settings = Settings(meta_app_id="app", meta_app_secret="secret")
    try:
        validate_embedded_signup(
            code=None,
            waba_id="123456789",
            phone_e164="+15551234567",
            settings=settings,
        )
        assert False, "expected ValueError"
    except ValueError as exc:
        assert "authorization code" in str(exc).lower()
