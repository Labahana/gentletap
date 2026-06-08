from fastapi.testclient import TestClient

from gentletap.main import app

client = TestClient(app)


def test_health():
    r = client.get("/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_and_login():
    email = "yusuf+test@gentletap.dev"
    password = "securepass123"

    r = client.post("/v1/auth/register", json={"email": email, "password": password, "full_name": "Yusuf"})
    assert r.status_code == 201
    token = r.json()["access_token"]

    r = client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == email
    assert r.json()["onboarding_step"] == "quickbooks"

def test_intelligence_preview():
    r = client.post("/v1/intelligence/preview")
    assert r.status_code == 200
    data = r.json()
    assert data["action"] == "send"
    assert data["message"]["subject"]
    assert "Sarah" in data["message"]["body"]
