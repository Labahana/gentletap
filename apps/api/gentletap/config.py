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
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_recycle: int = 1800
    ai_rate_limit_per_minute: int = 60
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

    freshbooks_client_id: str = ""
    freshbooks_client_secret: str = ""
    freshbooks_redirect_uri: str = "http://localhost:8000/v1/freshbooks/callback"

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/v1/google/callback"
    google_auth_redirect_uri: str = ""

    resend_api_key: str = ""
    resend_webhook_secret: str = ""
    auth_email_from: str = "GentleTap <noreply@gentletap.co>"
    platform_email_address: str = "accounts@notify.gentletap.co"

    kimi_api_key: str = ""
    kimi_model: str = "kimi-k2.6"

    # z.ai (Zhipu / GLM) — OpenAI-compatible fallback when Kimi is unavailable.
    zai_api_key: str = ""
    zai_model: str = "glm-4.7-flash"
    zai_base_url: str = "https://api.z.ai/api/paas/v4/"

    paddle_api_key: str = ""
    paddle_webhook_secret: str = ""
    paddle_client_token: str = ""
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

    kimi_model_priority: str = "kimi-k2.6"

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = ""
    twilio_whatsapp_content_sid_gentle: str = ""
    twilio_whatsapp_content_sid_follow_up: str = ""
    twilio_whatsapp_content_sid_final: str = ""

    sentry_dsn: str = ""

    skip_db_migrations: bool = False

    # Trust X-Real-IP / X-Forwarded-For from the reverse proxy (nginx) when
    # determining the client IP for rate limiting and the admin IP allowlist.
    # Enable ONLY when the app is reachable exclusively through a trusted proxy
    # (the compose files bind web/api to localhost so this holds in production).
    # If the app is ever exposed directly, leave this false or clients can
    # spoof their IP to bypass rate limits and the admin allowlist. Set true
    # only when nginx/another trusted proxy terminates TLS in front.
    trust_proxy_headers: bool = False

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    free_plan_monthly_collection_limit: int = 5

    # Platform admin — comma-separated allowlists; empty admin_emails disables /v1/admin routes.
    admin_emails: list[str] = []
    admin_ip_allowlist: list[str] = []

    affiliate_default_commission_rate: float = 0.30
    affiliate_cookie_days: int = 30
    # Months of recurring commission per referred customer (from first payment).
    affiliate_commission_months: int = 24
    # Audience discount when checkout is attributed to an affiliate referral.
    affiliate_referral_discount_percent: float = 0.20
    affiliate_referral_discount_months: int = 3
    # Paddle discount ID (create in Paddle: e.g. 20% off for 3 billing cycles). Empty = no auto-discount.
    paddle_discount_id_affiliate_referral: str = ""

    @field_validator("admin_emails", "admin_ip_allowlist", mode="before")
    @classmethod
    def parse_admin_lists(cls, value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item).strip().lower() for item in value if str(item).strip()]
        if isinstance(value, str):
            return [item.strip().lower() for item in value.split(",") if item.strip()]
        return []

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
    from cryptography.fernet import Fernet

    from gentletap.integrations.google import auth_signin

    if not settings.is_production:
        return
    missing: list[str] = []
    if settings.secret_key == _DEV_SECRET_KEY:
        missing.append("SECRET_KEY")
    if settings.jwt_secret_key == _DEV_JWT_SECRET_KEY:
        missing.append("JWT_SECRET_KEY")
    if not settings.token_encryption_key.strip():
        missing.append("TOKEN_ENCRYPTION_KEY")
    else:
        try:
            Fernet(settings.token_encryption_key.strip().encode())
        except ValueError:
            missing.append(
                "TOKEN_ENCRYPTION_KEY (not a valid Fernet key — generate with: "
                "python3 -c \"import base64,os; print(base64.urlsafe_b64encode(os.urandom(32)).decode())\")"
            )
    if missing:
        raise RuntimeError(
            "Production environment requires secure values for: " + ", ".join(missing)
        )

    gmail_redirect = settings.google_redirect_uri.strip().rstrip("/")
    auth_redirect = auth_signin.auth_redirect_uri(settings).strip().rstrip("/")
    if gmail_redirect == auth_redirect:
        raise RuntimeError(
            "GOOGLE_REDIRECT_URI must differ from GOOGLE_AUTH_REDIRECT_URI — "
            "Gmail connect and Google sign-in use separate callback paths."
        )
    if "/auth/google/callback" in gmail_redirect:
        raise RuntimeError(
            "GOOGLE_REDIRECT_URI must be /v1/google/callback (Gmail send), not the sign-in callback."
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
