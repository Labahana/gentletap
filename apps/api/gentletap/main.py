from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from gentletap.api import auth, core, intelligence, invoices, quickbooks
from gentletap.config import get_settings
from gentletap.database import Base, engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Dev convenience: ensure tables exist (Alembic is source of truth in prod)
    if get_settings().environment == "development":
        Base.metadata.create_all(bind=engine)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="GentleTap API",
        description="AI-native payment collection for freelancers",
        version="0.1.0",
        lifespan=lifespan,
    )

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
    app.include_router(invoices.router, prefix=prefix)
    app.include_router(intelligence.router, prefix=prefix)

    @app.get("/")
    def root() -> dict:
        return {
            "name": "GentleTap API",
            "version": "0.1.0",
            "docs": "/docs",
            "health": f"{prefix}/health",
        }

    return app


app = create_app()
