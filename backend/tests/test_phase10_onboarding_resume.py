"""Onboarding skip -> resume round-trip: the dismissed flag gates the wizard re-entry."""

import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("PADDLE_API_KEY", "test")
os.environ.setdefault("PADDLE_CLIENT_TOKEN", "test")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database():
    app.dependency_overrides[get_db] = override_get_db
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


client = TestClient(app)


def _auth_headers():
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S%f")
    signup = client.post(
        "/api/v1/auth/signup",
        json={"email": f"onb_{ts}@test.com", "password": "testpass123", "full_name": "Onb"},
    )
    assert signup.status_code == 200, signup.text
    return {"Authorization": f"Bearer {signup.json()['access_token']}"}


def test_skip_then_resume_round_trip():
    headers = _auth_headers()

    # Step 1 validation accepts the sample-invoice path, landing the org at step 2.
    step = client.post(
        "/api/v1/onboarding/step", json={"step": 1, "data": {"sample": True}}, headers=headers
    )
    assert step.status_code == 200, step.text

    skip = client.post("/api/v1/onboarding/skip", headers=headers)
    assert skip.status_code == 200, skip.text
    state = client.get("/api/v1/onboarding", headers=headers).json()
    assert state["dismissed"] is True
    assert state["complete"] is False

    resume = client.post("/api/v1/onboarding/resume", headers=headers)
    assert resume.status_code == 200, resume.text
    assert resume.json()["resumed"] is True

    state = client.get("/api/v1/onboarding", headers=headers).json()
    assert state["dismissed"] is False
    # Resume keeps the saved step so the wizard re-opens where the user left off.
    assert state["step"] >= 2


def test_resume_creates_state_for_never_started_org():
    headers = _auth_headers()
    resume = client.post("/api/v1/onboarding/resume", headers=headers)
    assert resume.status_code == 200, resume.text
    state = client.get("/api/v1/onboarding", headers=headers).json()
    assert state["dismissed"] is False
