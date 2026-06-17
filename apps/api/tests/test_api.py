from fastapi.testclient import TestClient

from gentletap.main import app

client = TestClient(app)


def test_health():
    r = client.get("/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_and_login(requires_db):
    email = "yusuf+test@gentletap.dev"
    password = "securepass123"

    r = client.post("/v1/auth/register", json={"email": email, "password": password, "full_name": "Yusuf"})
    assert r.status_code == 201
    data = r.json()
    assert data["access_token"]
    assert data.get("refresh_token")

    r = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {data['access_token']}"})
    assert r.status_code == 200
    assert r.json()["email"] == email
    assert r.json()["onboarding_step"] == "quickbooks"


def test_invoices_summary_requires_auth():
    r = client.get("/v1/invoices/summary")
    assert r.status_code == 401
