from fastapi.testclient import TestClient

from gentletap.config import get_settings
from gentletap.main import app

client = TestClient(app)


def _clear_settings_cache() -> None:
    get_settings.cache_clear()


def test_admin_routes_return_404_for_non_allowlisted_user(requires_db, monkeypatch):
    monkeypatch.setenv("ADMIN_EMAILS", "superadmin@gentletap.dev")
    _clear_settings_cache()

    email = "not-admin@gentletap.dev"
    password = "securepass123"
    client.post("/v1/auth/register", json={"email": email, "password": password, "full_name": "User"})
    login = client.post("/v1/auth/login", json={"email": email, "password": password})
    token = login.json()["access_token"]

    r = client.get("/v1/admin/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404

    _clear_settings_cache()


def test_admin_me_for_allowlisted_user(requires_db, monkeypatch):
    email = "superadmin@gentletap.dev"
    monkeypatch.setenv("ADMIN_EMAILS", email)
    _clear_settings_cache()

    password = "securepass123"
    client.post("/v1/auth/register", json={"email": email, "password": password, "full_name": "Admin"})
    login = client.post("/v1/auth/login", json={"email": email, "password": password})
    token = login.json()["access_token"]

    r = client.get("/v1/admin/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["admin"] is True
    assert data["email"] == email

    _clear_settings_cache()


def test_admin_requires_auth():
    r = client.get("/v1/admin/overview")
    assert r.status_code == 401
