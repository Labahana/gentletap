from functools import lru_cache
from typing import List, Optional
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "GentleTap"
    environment: str = Field(default="production", validation_alias=AliasChoices("ENVIRONMENT", "environment"))
    debug: bool = False
    api_url: str = Field(default="https://gentletap.co", validation_alias=AliasChoices("API_URL", "api_url"))
    web_url: str = Field(default="https://gentletap.co", validation_alias=AliasChoices("WEB_URL", "web_url", "FRONTEND_URL", "frontend_url"))
    # SECURITY: no defaults for secrets. All of these MUST come from the
    # environment in production (see .env.example + backend/scripts/security_check.py).
    # Previous committed values were scrubbed — rotate any that were live.
    admin_api_key: str = Field(default="", validation_alias=AliasChoices("ADMIN_API_KEY", "admin_api_key"))

    # Legal
    legal_entity_name: str = Field(default="GentleTap", validation_alias=AliasChoices("NEXT_PUBLIC_LEGAL_ENTITY_NAME", "legal_entity_name"))
    legal_entity_address: str = Field(default="Nigeria", validation_alias=AliasChoices("NEXT_PUBLIC_LEGAL_ENTITY_ADDRESS", "legal_entity_address"))

    # Security & Keys
    secret_key: str = Field(default="your_secret_key_here", validation_alias=AliasChoices("SECRET_KEY", "secret_key"))
    jwt_secret_key: str = Field(default="your_jwt_secret_key_here", validation_alias=AliasChoices("JWT_SECRET_KEY", "jwt_secret_key"))
    jwt_algorithm: str = Field(default="HS256", validation_alias=AliasChoices("JWT_ALGORITHM", "jwt_algorithm"))
    access_token_expire_minutes: int = Field(default=60, validation_alias=AliasChoices("ACCESS_TOKEN_EXPIRE_MINUTES", "access_token_expire_minutes"))
    refresh_token_expire_days: int = Field(default=30, validation_alias=AliasChoices("REFRESH_TOKEN_EXPIRE_DAYS", "refresh_token_expire_days"))
    token_encryption_key: str = Field(default="", validation_alias=AliasChoices("TOKEN_ENCRYPTION_KEY", "token_encryption_key"))

    # Database
    postgres_user: str = Field(default="gentletap", validation_alias=AliasChoices("POSTGRES_USER", "postgres_user"))
    postgres_password: str = Field(default="gentletap_postgres_password", validation_alias=AliasChoices("POSTGRES_PASSWORD", "postgres_password"))
    postgres_db: str = Field(default="gentletap", validation_alias=AliasChoices("POSTGRES_DB", "postgres_db"))
    database_url: str = Field(
        default="postgresql+psycopg2://gentletap:gentletap_postgres_password@postgres:5432/gentletap",
        validation_alias=AliasChoices("DATABASE_URL", "database_url")
    )
    database_migrations_url: str = Field(default="", validation_alias=AliasChoices("DATABASE_MIGRATIONS_URL", "database_migrations_url"))
    skip_db_migrations: bool = Field(default=False, validation_alias=AliasChoices("SKIP_DB_MIGRATIONS", "skip_db_migrations"))
    db_pool_size: int = Field(default=5, validation_alias=AliasChoices("DB_POOL_SIZE", "db_pool_size"))
    db_max_overflow: int = Field(default=10, validation_alias=AliasChoices("DB_MAX_OVERFLOW", "db_max_overflow"))
    db_pool_recycle: int = Field(default=1800, validation_alias=AliasChoices("DB_POOL_RECYCLE", "db_pool_recycle"))

    # Redis & Celery
    redis_password: str = Field(default="choose-a-strong-redis-password", validation_alias=AliasChoices("REDIS_PASSWORD", "redis_password"))
    redis_url: str = Field(default="redis://:choose-a-strong-redis-password@redis:6379/0", validation_alias=AliasChoices("REDIS_URL", "redis_url"))
    celery_broker_url: str = Field(default="redis://:choose-a-strong-redis-password@redis:6379/0", validation_alias=AliasChoices("CELERY_BROKER_URL", "celery_broker_url"))
    celery_result_backend: str = Field(default="redis://:choose-a-strong-redis-password@redis:6379/1", validation_alias=AliasChoices("CELERY_RESULT_BACKEND", "celery_result_backend"))

    # QuickBooks / Intuit
    intuit_client_id: str = Field(default="", validation_alias=AliasChoices("INTUIT_CLIENT_ID", "quickbooks_client_id"))
    intuit_client_secret: str = Field(default="", validation_alias=AliasChoices("INTUIT_CLIENT_SECRET", "quickbooks_client_secret"))
    intuit_redirect_uri: str = Field(default="https://gentletap.co/v1/quickbooks/callback", validation_alias=AliasChoices("INTUIT_REDIRECT_URI", "quickbooks_redirect_uri"))
    intuit_environment: str = Field(default="production", validation_alias=AliasChoices("INTUIT_ENVIRONMENT", "quickbooks_environment"))
    intuit_webhook_verifier_token: str = Field(default="", validation_alias=AliasChoices("INTUIT_WEBHOOK_VERIFIER_TOKEN", "intuit_webhook_verifier_token"))

    # FreshBooks
    freshbooks_client_id: str = Field(default="", validation_alias=AliasChoices("FRESHBOOKS_CLIENT_ID", "freshbooks_client_id"))
    freshbooks_client_secret: str = Field(default="", validation_alias=AliasChoices("FRESHBOOKS_CLIENT_SECRET", "freshbooks_client_secret"))
    freshbooks_redirect_uri: str = Field(default="https://gentletap.co/v1/freshbooks/callback", validation_alias=AliasChoices("FRESHBOOKS_REDIRECT_URI", "freshbooks_redirect_uri"))
    freshbooks_webhook_verifier_token: str = Field(default="", validation_alias=AliasChoices("FRESHBOOKS_WEBHOOK_VERIFIER_TOKEN", "freshbooks_webhook_verifier_token"))

    # Google (OAuth & Gmail API)
    google_client_id: str = Field(default="", validation_alias=AliasChoices("GOOGLE_CLIENT_ID", "google_client_id"))
    google_client_secret: str = Field(default="", validation_alias=AliasChoices("GOOGLE_CLIENT_SECRET", "google_client_secret"))
    google_redirect_uri: str = Field(default="https://gentletap.co/v1/google/callback", validation_alias=AliasChoices("GOOGLE_REDIRECT_URI", "google_redirect_uri"))
    google_auth_redirect_uri: str = Field(default="https://gentletap.co/auth/google/callback", validation_alias=AliasChoices("GOOGLE_AUTH_REDIRECT_URI", "google_auth_redirect_uri"))

    # Resend & Email
    resend_api_key: str = Field(default="", validation_alias=AliasChoices("RESEND_API_KEY", "resend_api_key"))
    resend_webhook_secret: str = Field(default="", validation_alias=AliasChoices("RESEND_WEBHOOK_SECRET", "resend_webhook_secret"))
    auth_email_from: str = Field(default="GentleTap <noreply@gentletap.co>", validation_alias=AliasChoices("AUTH_EMAIL_FROM", "auth_email_from", "RESEND_FROM_EMAIL", "resend_from_email"))
    platform_email_address: str = Field(default="accounts@notify.gentletap.co", validation_alias=AliasChoices("PLATFORM_EMAIL_ADDRESS", "platform_email_address"))

    # AI Models
    kimi_api_key: str = Field(default="", validation_alias=AliasChoices("KIMI_API_KEY", "kimi_api_key"))
    kimi_model: str = Field(default="kimi-k2.6", validation_alias=AliasChoices("KIMI_MODEL", "kimi_model"))
    kimi_model_priority: str = Field(default="kimi-k2.6", validation_alias=AliasChoices("KIMI_MODEL_PRIORITY", "kimi_model_priority"))
    kimi_api_base: str = "https://api.moonshot.cn/v1"
    kimi_timeout_seconds: float = Field(default=30.0, validation_alias=AliasChoices("KIMI_TIMEOUT_SECONDS", "kimi_timeout_seconds"))
    ai_rate_limit_per_minute: int = Field(default=60, validation_alias=AliasChoices("AI_RATE_LIMIT_PER_MINUTE", "ai_rate_limit_per_minute"))

    zai_api_key: str = Field(default="", validation_alias=AliasChoices("ZAI_API_KEY", "zai_api_key"))
    zai_model: str = Field(default="glm-4.7-flash", validation_alias=AliasChoices("ZAI_MODEL", "zai_model"))
    zai_api_base: str = Field(default="https://api.z.ai/api/paas/v4/", validation_alias=AliasChoices("ZAI_BASE_URL", "zai_base_url"))
    zai_timeout_seconds: float = Field(default=30.0, validation_alias=AliasChoices("ZAI_TIMEOUT_SECONDS", "zai_timeout_seconds"))

    # Paddle Billing
    paddle_api_key: str = Field(default="", validation_alias=AliasChoices("PADDLE_API_KEY", "paddle_api_key"))
    paddle_webhook_secret: str = Field(default="", validation_alias=AliasChoices("PADDLE_WEBHOOK_SECRET", "paddle_webhook_secret"))
    paddle_env: str = Field(default="production", validation_alias=AliasChoices("PADDLE_ENVIRONMENT", "paddle_environment"))
    paddle_api_base: str = "https://api.paddle.com"
    paddle_price_id_pro: str = Field(default="pri_01kz6rsd3vkh7rj3qvjn51ws75", validation_alias=AliasChoices("PADDLE_PRICE_ID_PRO", "paddle_price_id_pro"))
    paddle_price_id_pro_monthly: str = Field(default="pri_01kz6rsd3vkh7rj3qvjn51ws75", validation_alias=AliasChoices("PADDLE_PRICE_ID_PRO_MONTHLY", "paddle_price_id_pro_monthly"))
    paddle_price_id_pro_annual: str = Field(default="pri_01kz6rza2m68x2xycjnz12jk2e", validation_alias=AliasChoices("PADDLE_PRICE_ID_PRO_ANNUAL", "paddle_price_id_pro_annual"))
    paddle_price_id_pro_plus_monthly: str = Field(default="pri_01kz6s1rdexkspa22eckc4xwx3", validation_alias=AliasChoices("PADDLE_PRICE_ID_PRO_PLUS_MONTHLY", "paddle_price_id_pro_plus_monthly"))
    paddle_price_id_pro_plus_annual: str = Field(default="pri_01kz6s4asektyvd1ea6my8ttg4", validation_alias=AliasChoices("PADDLE_PRICE_ID_PRO_PLUS_ANNUAL", "paddle_price_id_pro_plus_annual"))
    paddle_price_id_team_monthly: str = Field(default="pri_01kz6s6j5d7kfc7q9e59f7verw", validation_alias=AliasChoices("PADDLE_PRICE_ID_TEAM_MONTHLY", "paddle_price_id_team_monthly"))
    paddle_price_id_team_annual: str = Field(default="pri_01kz6s96599wvmwagg2x28f8wd", validation_alias=AliasChoices("PADDLE_PRICE_ID_TEAM_ANNUAL", "paddle_price_id_team_annual"))
    paddle_price_id_whatsapp_250: str = Field(default="pri_01kz6t8kyk82jz6994qp9708s6", validation_alias=AliasChoices("PADDLE_PRICE_ID_WHATSAPP_250", "paddle_price_id_whatsapp_250"))
    paddle_price_id_whatsapp_500: str = Field(default="pri_01kz6tagk3n8mgydmm5bfvxwsf", validation_alias=AliasChoices("PADDLE_PRICE_ID_WHATSAPP_500", "paddle_price_id_whatsapp_500"))

    # Twilio WhatsApp
    twilio_account_sid: str = Field(default="", validation_alias=AliasChoices("TWILIO_ACCOUNT_SID", "twilio_account_sid"))
    twilio_auth_token: str = Field(default="", validation_alias=AliasChoices("TWILIO_AUTH_TOKEN", "twilio_auth_token"))
    twilio_whatsapp_from: str = Field(default="whatsapp:+14155238886", validation_alias=AliasChoices("TWILIO_WHATSAPP_FROM", "twilio_whatsapp_from"))
    twilio_whatsapp_content_sid_gentle: str = Field(default="", validation_alias=AliasChoices("TWILIO_WHATSAPP_CONTENT_SID_GENTLE", "twilio_whatsapp_content_sid_gentle"))
    twilio_whatsapp_content_sid_follow_up: str = Field(default="", validation_alias=AliasChoices("TWILIO_WHATSAPP_CONTENT_SID_FOLLOW_UP", "twilio_whatsapp_content_sid_follow_up"))
    twilio_whatsapp_content_sid_final: str = Field(default="", validation_alias=AliasChoices("TWILIO_WHATSAPP_CONTENT_SID_FINAL", "twilio_whatsapp_content_sid_final"))
    twilio_use_subaccounts: bool = Field(default=True, validation_alias=AliasChoices("TWILIO_USE_SUBACCOUNTS", "twilio_use_subaccounts"))
    whatsapp_own_auto_activate: bool = Field(default=False, validation_alias=AliasChoices("WHATSAPP_OWN_AUTO_ACTIVATE", "whatsapp_own_auto_activate"))

    # Meta
    meta_app_id: str = Field(default="", validation_alias=AliasChoices("META_APP_ID", "meta_app_id"))
    meta_app_secret: str = Field(default="", validation_alias=AliasChoices("META_APP_SECRET", "meta_app_secret"))
    meta_embedded_signup_config_id: str = Field(default="", validation_alias=AliasChoices("META_EMBEDDED_SIGNUP_CONFIG_ID", "meta_embedded_signup_config_id"))
    meta_partner_solution_id: str = Field(default="", validation_alias=AliasChoices("META_PARTNER_SOLUTION_ID", "meta_partner_solution_id"))

    # Affiliates & Plans
    affiliate_default_commission_rate: float = Field(default=0.30, validation_alias=AliasChoices("AFFILIATE_DEFAULT_COMMISSION_RATE", "affiliate_default_commission_rate"))
    affiliate_cookie_days: int = Field(default=30, validation_alias=AliasChoices("AFFILIATE_COOKIE_DAYS", "affiliate_cookie_days"))
    affiliate_commission_months: int = Field(default=24, validation_alias=AliasChoices("AFFILIATE_COMMISSION_MONTHS", "affiliate_commission_months"))
    affiliate_first_month_rate: float = Field(default=0.50, validation_alias=AliasChoices("AFFILIATE_FIRST_MONTH_RATE", "affiliate_first_month_rate"))
    affiliate_tier2_threshold: float = Field(default=500.0, validation_alias=AliasChoices("AFFILIATE_TIER2_THRESHOLD", "affiliate_tier2_threshold"))
    affiliate_tier2_rate: float = Field(default=0.35, validation_alias=AliasChoices("AFFILIATE_TIER2_RATE", "affiliate_tier2_rate"))
    affiliate_tier3_threshold: float = Field(default=2000.0, validation_alias=AliasChoices("AFFILIATE_TIER3_THRESHOLD", "affiliate_tier3_threshold"))
    affiliate_tier3_rate: float = Field(default=0.40, validation_alias=AliasChoices("AFFILIATE_TIER3_RATE", "affiliate_tier3_rate"))
    affiliate_payout_minimum: float = Field(default=20.0, validation_alias=AliasChoices("AFFILIATE_PAYOUT_MINIMUM", "affiliate_payout_minimum"))
    affiliate_referral_discount_percent: float = Field(default=0.20, validation_alias=AliasChoices("AFFILIATE_REFERRAL_DISCOUNT_PERCENT", "affiliate_referral_discount_percent"))
    affiliate_referral_discount_months: int = Field(default=3, validation_alias=AliasChoices("AFFILIATE_REFERRAL_DISCOUNT_MONTHS", "affiliate_referral_discount_months"))
    paddle_discount_id_affiliate_referral: str = Field(default="dsc_01kw9vns95j03reet7gj0sff35", validation_alias=AliasChoices("PADDLE_DISCOUNT_ID_AFFILIATE_REFERRAL", "paddle_discount_id_affiliate_referral"))
    free_plan_monthly_collection_limit: int = Field(default=5, validation_alias=AliasChoices("FREE_PLAN_MONTHLY_COLLECTION_LIMIT", "free_plan_monthly_collection_limit"))

    # Admin
    admin_emails: List[str] = Field(default=["tahiryahuzayusuf@gmail.com"], validation_alias=AliasChoices("ADMIN_EMAILS", "admin_emails"))
    admin_ip_allowlist: List[str] = Field(default=[], validation_alias=AliasChoices("ADMIN_IP_ALLOWLIST", "admin_ip_allowlist"))
    trust_proxy_headers: bool = Field(default=True, validation_alias=AliasChoices("TRUST_PROXY_HEADERS", "trust_proxy_headers"))

    # CORS
    cors_origins: List[str] = Field(
        default=["https://gentletap.co", "https://www.gentletap.co", "http://localhost:3000"],
        validation_alias=AliasChoices("CORS_ORIGINS", "cors_origins")
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Compatibility getters
    @property
    def frontend_url(self) -> str:
        return self.web_url

    @property
    def resend_from_email(self) -> str:
        return self.auth_email_from

    @property
    def quickbooks_client_id(self) -> str:
        return self.intuit_client_id

    @property
    def quickbooks_client_secret(self) -> str:
        return self.intuit_client_secret

    @property
    def quickbooks_redirect_uri(self) -> str:
        return self.intuit_redirect_uri

    @property
    def quickbooks_environment(self) -> str:
        return self.intuit_environment


@lru_cache()
def get_settings() -> Settings:
    return Settings()
