import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import engine, Base
import app.models

from app.api import (
    auth,
    users,
    organizations,
    connections,
    invoices,
    clients,
    templates,
    sequences,
    messages,
    payouts,
    dashboard,
    analytics,
    usage,
    notifications,
    escalation_rules,
    affiliates,
    intelligence,
    settings as settings_router,
    webhooks,
    reminders,
    client_profiles,
    billing,
    team,
    public,
    admin,
    onboarding,
    health,
)

logger = logging.getLogger("gentletap")
logging.basicConfig(level=logging.INFO)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialization complete.")
    yield


app = FastAPI(
    title=settings.app_name,
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Auth uses Bearer tokens in the Authorization header (never cookies), so
# cross-origin requests carry no ambient credentials. A permissive CORS policy
# is therefore safe here and eliminates the entire class of "login works on
# gentletap.co but fails from <other-host>" failures caused by origin
# allow-list mismatches on deploys.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment, "phase": 3}


api_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(users.router, prefix=api_prefix)
app.include_router(organizations.router, prefix=api_prefix)
app.include_router(connections.router, prefix=api_prefix)
app.include_router(reminders.router, prefix=api_prefix)
app.include_router(invoices.router, prefix=api_prefix)
app.include_router(client_profiles.router, prefix=api_prefix)
app.include_router(clients.router, prefix=api_prefix)
app.include_router(templates.router, prefix=api_prefix)
app.include_router(sequences.router, prefix=api_prefix)
app.include_router(messages.router, prefix=api_prefix)
app.include_router(payouts.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(analytics.router, prefix=api_prefix)
app.include_router(usage.router, prefix=api_prefix)
app.include_router(notifications.router, prefix=api_prefix)
app.include_router(escalation_rules.router, prefix=api_prefix)
app.include_router(affiliates.router, prefix=api_prefix)
app.include_router(intelligence.router, prefix=api_prefix)
app.include_router(settings_router.router, prefix=api_prefix)
app.include_router(webhooks.router, prefix=api_prefix)
app.include_router(billing.router, prefix=api_prefix)
app.include_router(team.router, prefix=api_prefix)
app.include_router(public.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(onboarding.router, prefix=api_prefix)
app.include_router(health.router, prefix=api_prefix)
