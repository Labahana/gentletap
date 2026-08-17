from functools import lru_cache
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GentleTap"
    environment: str = "development"
    debug: bool = True
    api_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"
    admin_api_key: str = "gentletap_admin_dev_key_change_me"

    # Database
    database_url: str = "postgresql://gentletap:gentletappassword@localhost:5433/gentletap"
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # JWT Security
    jwt_secret_key: str = "gentletap_jwt_secret_key_change_in_production_32bytes!"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    # OAuth / Token Encryption
    token_encryption_key: str = "gentletap_encryption_key_32bytes!"

    # Resend
    resend_api_key: str = "re_mock_key_for_dev"
    resend_from_email: str = "reminders@gentletap.com"

    # AI
    kimi_api_key: str = ""
    kimi_api_base: str = "https://api.moonshot.cn/v1"
    kimi_model: str = "moonshot-v1-8k"
    kimi_timeout_seconds: int = 20
    zai_api_key: str = ""
    zai_api_base: str = "https://open.bigmodel.cn/api/paas/v4"
    zai_model: str = "glm-4-flash"
    zai_timeout_seconds: int = 20

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # Deliverability
    org_daily_email_cap: int = 500
    starter_daily_email_cap: int = 50
    contact_window_start_hour: int = 8
    contact_window_end_hour: int = 21

    # Paddle Billing
    paddle_api_key: str = ""
    paddle_webhook_secret: str = ""
    paddle_env: str = "sandbox"  # sandbox | live
    paddle_api_base: str = "https://api.paddle.com"
    paddle_plan_pro_monthly: str = "pri_pro_monthly"
    paddle_plan_pro_annual: str = "pri_pro_annual"
    paddle_plan_pro_plus_monthly: str = "pri_pro_plus_monthly"
    paddle_plan_pro_plus_annual: str = "pri_pro_plus_annual"
    paddle_plan_team_monthly: str = "pri_team_monthly"
    paddle_plan_team_annual: str = "pri_team_annual"
    paddle_credit_pack_500: str = "pri_credits_500"

    # Twilio WhatsApp
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_whatsapp_from: str = "whatsapp:+14155238886"

    # Accounting OAuth
    quickbooks_client_id: str = ""
    quickbooks_client_secret: str = ""
    quickbooks_redirect_uri: str = "http://localhost:3000/integrations/quickbooks/callback"
    quickbooks_environment: str = "sandbox"
    freshbooks_client_id: str = ""
    freshbooks_client_secret: str = ""
    freshbooks_redirect_uri: str = "http://localhost:3000/integrations/freshbooks/callback"
    google_client_id: str = ""
    google_client_secret: str = ""

    # CORS
    cors_origins: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def paddle_base(self) -> str:
        if self.paddle_env == "sandbox":
            return "https://sandbox-api.paddle.com"
        return self.paddle_api_base or "https://api.paddle.com"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
