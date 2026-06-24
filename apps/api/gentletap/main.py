from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from gentletap.api import (
    admin,
    analytics,
    auth,
    billing,
    clients,
    core,
    escalations,
    google,
    invoices,
    notifications,
    quickbooks,
    reminders,
    webhooks,
    whatsapp,
)
from gentletap.api.google import email_router
from gentletap.config import get_settings, validate_production_settings
from gentletap.middleware.security_headers import SecurityHeadersMiddleware
from gentletap.rate_limit import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_production_settings(get_settings())
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    hide_docs = settings.is_production
    app = FastAPI(
        title="GentleTap API",
        description="AI-native payment collection for freelancers",
        version="1.0.0",
        lifespan=lifespan,
        docs_url=None if hide_docs else "/docs",
        redoc_url=None if hide_docs else "/redoc",
        openapi_url=None if hide_docs else "/openapi.json",
    )
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)

    if settings.sentry_dsn:
        try:
            import sentry_sdk

            sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment)
        except ImportError:
            pass

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    prefix = "/v1"
    app.include_router(core.router, prefix=prefix)
    app.include_router(auth.router, prefix=prefix)
    app.include_router(quickbooks.router, prefix=prefix)
    app.include_router(google.router, prefix=prefix)
    app.include_router(email_router, prefix=prefix)
    app.include_router(invoices.router, prefix=prefix)
    app.include_router(clients.router, prefix=prefix)
    app.include_router(analytics.router, prefix=prefix)
    app.include_router(reminders.router, prefix=prefix)
    app.include_router(escalations.router, prefix=prefix)
    app.include_router(notifications.router, prefix=prefix)
    app.include_router(billing.router, prefix=prefix)
    app.include_router(whatsapp.router, prefix=prefix)
    app.include_router(webhooks.router, prefix=prefix)
    app.include_router(admin.router, prefix=prefix)

    @app.get("/")
    def root() -> dict:
        return {
            "name": "GentleTap API",
            "version": "1.0.0",
            "docs": "/docs",
            "health": f"{prefix}/health",
        }

    return app


app = create_app()
