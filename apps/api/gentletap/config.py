import json
from functools import lru_cache
from typing import Any

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    secret_key: str = "dev-secret-change-in-production"
    token_encryption_key: str = ""

    jwt_secret_key: str = "dev-jwt-secret-change-in-production-min-32"
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

    resend_api_key: str = ""
    resend_webhook_secret: str = ""

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_pro: str = ""
    stripe_price_id_pro_monthly: str = ""
    stripe_price_id_pro_annual: str = ""
    stripe_price_id_pro_plus_monthly: str = ""
    stripe_price_id_pro_plus_annual: str = ""
    stripe_price_id_team_monthly: str = ""
    stripe_price_id_team_annual: str = ""

    openai_model_priority: str = "gpt-4o"

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""
    twilio_whatsapp_content_sid_gentle: str = ""
    twilio_whatsapp_content_sid_follow_up: str = ""
    twilio_whatsapp_content_sid_final: str = ""

    sentry_dsn: str = ""

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    free_plan_active_invoice_limit: int = 5

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
