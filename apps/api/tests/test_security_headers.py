from fastapi.testclient import TestClient

from gentletap.main import app

client = TestClient(app)


def test_api_security_headers_on_health():
    r = client.get("/v1/health")
    assert r.status_code == 200
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert r.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
