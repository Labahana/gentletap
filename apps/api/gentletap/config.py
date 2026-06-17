import json
from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEV_SECRET_KEY = "dev-secret-change-in-production"
_DEV_JWT_SECRET_KEY = "dev-jwt-secret-change-in-production-min-32"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: str = "development"
    api_url: str = "http://localhost:8000"
    web_url: str = "http://localhost:3000"

    database_url: str = "postgresql+psycopg2://gentletap:gentletap@localhost:5433/gentletap"
    database_migrations_url: str = ""
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    secret_key: str = _DEV_SECRET_KEY
    token_encryption_key: str = ""

    jwt_secret_key: str = _DEV_JWT_SECRET_KEY
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    intuit_client_id: str = ""
    intuit_client_secret: str = ""
    intuit_redirect_uri: str = "http://localhost:8000/v1/quickbooks/callback"
    intuit_environment: str = "sandbox"
    intuit_webhook_verifier_token: str = ""

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/v1/google/callback"
    google_auth_redirect_uri: str = ""

    resend_api_key: str = ""
    resend_webhook_secret: str = ""
    auth_email_from: str = "GentleTap <noreply@gentletap.co>"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    paddle_api_key: str = ""
    paddle_webhook_secret: str = ""
    paddle_environment: str = "sandbox"
    paddle_price_id_pro: str = ""
    paddle_price_id_pro_monthly: str = ""
    paddle_price_id_pro_annual: str = ""
    paddle_price_id_pro_plus_monthly: str = ""
    paddle_price_id_pro_plus_annual: str = ""
    paddle_price_id_team_monthly: str = ""
    paddle_price_id_team_annual: str = ""
    paddle_price_id_whatsapp_250: str = ""
    paddle_price_id_whatsapp_500: str = ""

    openai_model_priority: str = "gpt-4o"

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""
    twilio_whatsapp_content_sid_gentle: str = ""
    twilio_whatsapp_content_sid_follow_up: str = ""
    twilio_whatsapp_content_sid_final: str = ""

    whatsapp_own_auto_activate: bool = False

    meta_app_id: str = ""
    meta_app_secret: str = ""
    meta_embedded_signup_config_id: str = ""
    meta_partner_solution_id: str = ""
    twilio_use_subaccounts: bool = True

    sentry_dsn: str = ""

    skip_db_migrations: bool = False

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    free_plan_monthly_collection_limit: int = 5

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("["):
                try:
                    parsed = json.loads(raw)
                    if isinstance(parsed, list):
                        return [str(origin).strip() for origin in parsed if str(origin).strip()]
                except json.JSONDecodeError:
                    pass
            return [origin.strip() for origin in raw.split(",") if origin.strip()]
        return value

    @property
    def alembic_database_url(self) -> str:
        return self.database_migrations_url.strip() or self.database_url

    @property
    def uses_supabase_pooler(self) -> bool:
        return "pooler.supabase.com:6543" in self.database_url

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in ("production", "prod")


def validate_production_settings(settings: Settings) -> None:
    """Fail fast when production runs with dev defaults."""
    if not settings.is_production:
        return
    missing: list[str] = []
    if settings.secret_key == _DEV_SECRET_KEY:
        missing.append("SECRET_KEY")
    if settings.jwt_secret_key == _DEV_JWT_SECRET_KEY:
        missing.append("JWT_SECRET_KEY")
    if not settings.token_encryption_key.strip():
        missing.append("TOKEN_ENCRYPTION_KEY")
    own_number_enabled = bool(
        settings.meta_app_id
        and settings.meta_embedded_signup_config_id
        and settings.twilio_account_sid
    )
    if own_number_enabled and not settings.meta_app_secret.strip():
        missing.append("META_APP_SECRET")
    if missing:
        raise RuntimeError(
            "Production environment requires secure values for: " + ", ".join(missing)
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
