from gentletap.integrations.twilio.embedded_signup import embedded_signup_public_config, is_embedded_signup_configured
from gentletap.config import Settings


def test_embedded_signup_not_configured_by_default():
    settings = Settings(
        meta_app_id="",
        meta_embedded_signup_config_id="",
        meta_partner_solution_id="",
        twilio_account_sid="",
        twilio_auth_token="",
    )
    assert is_embedded_signup_configured(settings) is False
    assert embedded_signup_public_config(settings)["configured"] is False


def test_embedded_signup_configured_when_env_set():
    settings = Settings(
        meta_app_id="123",
        meta_embedded_signup_config_id="cfg",
        meta_partner_solution_id="sol",
        twilio_account_sid="ACxxx",
        twilio_auth_token="token",
    )
    assert is_embedded_signup_configured(settings) is True
    pub = embedded_signup_public_config(settings)
    assert pub["app_id"] == "123"
    assert pub["config_id"] == "cfg"
