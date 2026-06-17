from fastapi.testclient import TestClient

from gentletap.main import app

client = TestClient(app)


def test_forgot_password_always_returns_success(requires_db):
    r = client.post("/v1/auth/forgot-password", json={"email": "nobody@example.com"})
    assert r.status_code == 200
    assert "account exists" in r.json()["message"].lower()


def test_google_auth_url_unconfigured():
    r = client.get("/v1/auth/google/url")
    # 503 when Google OAuth env vars are missing in test environment
    assert r.status_code in (200, 503)
