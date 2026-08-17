import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.user import User
from app.models.organization import Organization
from app.models.client import Client
from app.models.invoice import Invoice

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_signup_and_login_flow():
    # 1. Signup
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={
            "email": "test@gentletap.com",
            "password": "securepassword123",
            "full_name": "Test User",
            "organization_name": "Test Org",
        },
    )
    assert signup_res.status_code == 200
    token_data = signup_res.json()
    assert "access_token" in token_data
    assert token_data["org_name"] == "Test Org"
    assert token_data["plan"] in ("free", "starter")

    # 2. Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": "test@gentletap.com", "password": "securepassword123"},
    )
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()


def test_free_plan_invoice_limit():
    # Signup user
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "limit@gentletap.com", "password": "password123", "full_name": "Limit User"},
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create client
    client_res = client.post(
        "/api/v1/clients",
        json={"name": "Client A", "email": "clienta@test.com"},
        headers=headers,
    )
    client_id = client_res.json()["id"]

    # Create 3 invoices (Free plan limit)
    for i in range(1, 4):
        res = client.post(
            "/api/v1/invoices",
            json={
                "number": f"INV-00{i}",
                "client_id": client_id,
                "amount": 500.0,
                "currency": "USD",
            },
            headers=headers,
        )
        assert res.status_code == 200

    # 4th invoice creation should be blocked (403 Limit Exceeded)
    blocked_res = client.post(
        "/api/v1/invoices",
        json={
            "number": "INV-004",
            "client_id": client_id,
            "amount": 500.0,
            "currency": "USD",
        },
        headers=headers,
    )
    assert blocked_res.status_code == 403
    assert "Starter plan limit" in blocked_res.json()["detail"] or "Free plan limit" in blocked_res.json()["detail"] or "limit" in blocked_res.json()["detail"].lower()


def test_manual_send_safeguards():
    # Setup user & invoice
    signup_res = client.post(
        "/api/v1/auth/signup",
        json={"email": "send@gentletap.com", "password": "password123"},
    )
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    c_res = client.post("/api/v1/clients", json={"name": "Client B", "email": "b@test.com"}, headers=headers)
    client_id = c_res.json()["id"]

    inv_res = client.post(
        "/api/v1/invoices",
        json={"number": "INV-SEND-1", "client_id": client_id, "amount": 1200.0},
        headers=headers,
    )
    inv_id = inv_res.json()["id"]

    # 1. Send reminder
    send_res1 = client.post(
        "/api/v1/messages/send",
        json={
            "invoice_id": inv_id,
            "subject": "Reminder for #{invoice_number}",
            "body": "Hi {client_name}, your balance of {amount} is due.",
        },
        headers=headers,
    )
    assert send_res1.status_code == 200
    assert send_res1.json()["subject"] == "Reminder for #INV-SEND-1"
    assert "$1,200.00" in send_res1.json()["body"]

    # 2. Duplicate send within 60s should be blocked (429)
    send_res2 = client.post(
        "/api/v1/messages/send",
        json={
            "invoice_id": inv_id,
            "subject": "Reminder for #{invoice_number}",
            "body": "Duplicate send check.",
        },
        headers=headers,
    )
    assert send_res2.status_code == 429

    # 3. Mark invoice paid
    client.post(f"/api/v1/invoices/{inv_id}/mark-paid", headers=headers)

    # 4. Sending reminder on paid invoice should be blocked (400)
    paid_send_res = client.post(
        "/api/v1/messages/send",
        json={
            "invoice_id": inv_id,
            "subject": "Reminder after paid",
            "body": "Should fail",
            "preview": true if False else False,
        },
        headers=headers,
    )
    assert paid_send_res.status_code == 400
