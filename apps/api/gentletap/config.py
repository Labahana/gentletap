from functools import lru_cache

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

    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/v1/google/callback"

    resend_api_key: str = ""
    openai_api_key: str = ""

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id_pro: str = ""

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    free_plan_active_invoice_limit: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()
