"""Phase 14: site-aware support chatbot — grounding, escalation, handoff, admin API."""

import os
import sys
import json
import uuid
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("PADDLE_API_KEY", "test")
os.environ.setdefault("PADDLE_CLIENT_TOKEN", "test")

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.api import admin as admin_mod
from app.api.deps import create_access_token, get_current_user_and_org, hash_password
from app.models.chat import ChatHandoff, ChatMessage, ChatSession
from app.models.notification import UserNotification
from app.models.organization import Organization
from app.models.user import User
from app.services.chat import escalation, knowledge, llm, service

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

ADMIN_EMAIL = "root@example.com"


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    s = TestingSessionLocal()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _user(db, email=None):
    email = email or f"u{uuid.uuid4().hex[:12]}@t.com"
    u = User(email=email, full_name="U", password_hash=hash_password("pw12345"))
    db.add(u)
    db.flush()
    return u


def _org(db, owner=None, name="Org"):
    owner = owner or _user(db)
    o = Organization(name=name, owner_user_id=owner.id, plan="starter")
    db.add(o)
    db.flush()
    return o


def _fake_llm(monkeypatch, **overrides):
    control = {
        "reply": "Here is a helpful answer.",
        "intent": "how_to",
        "sentiment": "neutral",
        "confidence": 0.9,
        "escalate": False,
        "suggested_resolution": None,
        "sources": ["Pricing"],
    }
    control.update(overrides)
    monkeypatch.setattr(service.llm, "chat_completion", lambda *a, **k: dict(control))
    return control


# ---------------------------------------------------------------------------
# Knowledge retrieval
# ---------------------------------------------------------------------------

def test_pack_has_docs():
    meta = knowledge.pack_meta()
    assert meta["doc_count"] > 0
    assert meta["product"]

def test_retrieve_hits_corpus():
    docs = knowledge.retrieve("how much does it cost per month")
    assert docs
    assert all({"title", "text"} <= set(d) for d in docs)

def test_retrieve_falls_back_to_overview():
    docs = knowledge.retrieve("zzz qqq xyzzy nonwords")
    assert docs  # never empty as long as the pack loaded


def test_navigation_grounding_connects_via_integrations():
    # Regression: the bot once told a user "Settings → Connections". Connections
    # actually live on the Integrations page, so the pack must ground the right path.
    pack = knowledge._load_pack()
    blob = json.dumps(pack)
    assert "Settings → Connections" not in blob  # the wrong instruction is gone

    docs = knowledge.retrieve("how do I connect my FreshBooks account")
    joined = "\n".join(d["text"] for d in docs)
    assert "Integrations" in joined
    assert "Connect FreshBooks" in joined



# ---------------------------------------------------------------------------
# Escalation triggers (deterministic, model-independent)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize(
    "text,expected",
    [
        ("can I talk to a human please", "explicit_request"),
        ("I want a refund for last month", "sensitive_topic"),
        ("this is terrible and never works", "negative_sentiment"),
        ("how do I connect QuickBooks", None),
    ],
)
def test_decide_escalation_triggers(text, expected):
    got = escalation.decide_escalation(user_text=text, confidence=0.9)
    assert got == expected

def test_decide_escalation_priority_human_over_sensitive():
    # explicit request wins even when the text is also sensitive
    assert escalation.decide_escalation(user_text="human, I need a refund") == "explicit_request"

def test_decide_escalation_low_confidence_and_repeated_failure():
    assert escalation.decide_escalation(user_text="hmm", confidence=0.1) == "low_confidence"
    assert (
        escalation.decide_escalation(user_text="hmm", confidence=0.9, consecutive_low_confidence=escalation.REPEATED_FAILURE_LIMIT)
        == "repeated_failure"
    )


# ---------------------------------------------------------------------------
# LLM control-dict parsing
# ---------------------------------------------------------------------------

def test_parse_json_control():
    parsed = llm._parse('{"reply":"hi","confidence":"0.8","escalate":true,"sources":["a"]}')
    assert parsed["reply"] == "hi"
    assert parsed["confidence"] == 0.8
    assert parsed["escalate"] is True

def test_parse_plain_text_fallback():
    parsed = llm._parse("just some plain text, no json")
    assert parsed["reply"].startswith("just some plain")
    assert parsed["escalate"] is False
    assert parsed["confidence"] is None


# ---------------------------------------------------------------------------
# respond(): non-escalating turn persists a clean assistant message
# ---------------------------------------------------------------------------

def test_respond_no_escalation(db, monkeypatch):
    _fake_llm(monkeypatch)
    monkeypatch.setattr(service, "build_account_summary", lambda *a, **k: {"plan": "starter"})
    user = _user(db)
    org = _org(db, owner=user)
    sess = service.get_or_create_session(db, surface="app", session_id=None, org=org, user=user)
    res = service.respond(db, session=sess, message="how do sequences work", org=org, user=user)
    assert res["escalated"] is False
    assert res["handoff_id"] is None
    assert res["reply"]
    assert db.query(ChatHandoff).count() == 0
    # one user + one assistant message stored
    assert db.query(ChatMessage).filter(ChatMessage.session_id == sess.id).count() == 2


# ---------------------------------------------------------------------------
# respond(): app escalation creates a handoff + context package + admin notify
# ---------------------------------------------------------------------------

def test_respond_escalation_creates_handoff_and_notifies(db, monkeypatch):
    _fake_llm(monkeypatch, confidence=0.1, escalate=False)
    monkeypatch.setattr(service, "build_account_summary", lambda *a, **k: {"plan": "pro", "open_invoices": 3})
    monkeypatch.setattr(service, "get_settings", lambda: SimpleNamespace(admin_emails=[ADMIN_EMAIL]))
    admin = _user(db, email=ADMIN_EMAIL)
    admin_org = _org(db, owner=admin, name="Admin Co")

    user = _user(db)
    org = _org(db, owner=user, name="Acme")
    sess = service.get_or_create_session(db, surface="app", session_id=None, org=org, user=user)
    res = service.respond(db, session=sess, message="I have a billing question", org=org, user=user)

    assert res["escalated"] is True
    assert res["handoff_id"]
    h = db.get(ChatHandoff, res["handoff_id"])
    assert h.status == "open"
    assert h.org_id == org.id
    assert h.user_id == user.id
    assert h.trigger == "low_confidence"
    pkg = h.context_package
    assert pkg["account"].get("plan") == "pro"
    assert pkg["transcript"] and pkg["transcript"][-1]["role"] == "user"
    assert h.notified is True
    note = db.query(UserNotification).filter(UserNotification.type == "support_handoff").first()
    assert note is not None
    assert note.user_id == admin.id
    assert f"/admin?tab=support&handoff={h.id}" == note.link


def test_respond_one_open_handoff_per_session(db, monkeypatch):
    _fake_llm(monkeypatch, confidence=0.05)
    monkeypatch.setattr(service, "build_account_summary", lambda *a, **k: {})
    monkeypatch.setattr(service, "get_settings", lambda: SimpleNamespace(admin_emails=[ADMIN_EMAIL]))
    _org(db, owner=_user(db, email=ADMIN_EMAIL))  # admin owns an org
    user = _user(db)
    org = _org(db, owner=user)
    sess = service.get_or_create_session(db, surface="app", session_id=None, org=org, user=user)
    service.respond(db, session=sess, message="q1", org=org, user=user)
    second = service.respond(db, session=sess, message="q2", org=org, user=user)
    # second turn reuses the same open handoff rather than spamming admins
    assert db.query(ChatHandoff).filter(ChatHandoff.session_id == sess.id).count() == 1
    assert second["handoff_id"] == db.query(ChatHandoff).first().id


def test_public_handoff_notification_uses_admin_owned_org(db, monkeypatch):
    # Regression: anonymous (public) escalations have no org — the notification
    # must attach to an org the admin actually owns, never the admin's user id.
    _fake_llm(monkeypatch, confidence=0.05)
    monkeypatch.setattr(service, "get_settings", lambda: SimpleNamespace(admin_emails=[ADMIN_EMAIL]))
    admin = _user(db, email=ADMIN_EMAIL)
    admin_org = _org(db, owner=admin, name="Admin Co")
    sess = service.get_or_create_session(db, surface="public", session_id=None, visitor_id="v-1")
    service.respond(db, session=sess, message="I want to speak to someone")
    note = db.query(UserNotification).filter(UserNotification.type == "support_handoff").first()
    assert note is not None
    assert note.org_id == admin_org.id
    assert note.org_id != admin.id


# ---------------------------------------------------------------------------
# Authed history route is org-scoped (no cross-org leak)
# ---------------------------------------------------------------------------

def test_history_org_scoped(db, client):
    user = _user(db)
    org = _org(db, owner=user)
    sess = service.get_or_create_session(db, surface="app", session_id=None, org=org, user=user)
    db.add(ChatMessage(session_id=sess.id, role="user", content="hi"))
    db.commit()

    # another org's user must get 404 for this session
    other = _user(db)
    other_org = _org(db, owner=other)
    app.dependency_overrides[get_current_user_and_org] = lambda: (other, other_org)
    r = client.get(f"/api/v1/chat/history/{sess.id}")
    assert r.status_code == 404

    # the owning org can read it
    app.dependency_overrides[get_current_user_and_org] = lambda: (user, org)
    r2 = client.get(f"/api/v1/chat/history/{sess.id}")
    assert r2.status_code == 200
    assert r2.json()["messages"][0]["content"] == "hi"


# ---------------------------------------------------------------------------
# Admin handoffs API: list + status transition (gated)
# ---------------------------------------------------------------------------

def _admin_client(db, client, monkeypatch):
    monkeypatch.setattr(admin_mod.settings, "admin_emails", [ADMIN_EMAIL])
    admin = _user(db, email=ADMIN_EMAIL)
    org = _org(db, owner=admin)
    token = create_access_token(admin.id, org.id, admin.email)
    client.headers["Authorization"] = f"Bearer {token}"
    return client


def _seed_handoff(db):
    user = _user(db)
    org = _org(db, owner=user, name="Acme")
    sess = service.get_or_create_session(db, surface="app", session_id=None, org=org, user=user)
    h = ChatHandoff(
        session_id=sess.id, org_id=org.id, user_id=user.id, surface="app",
        trigger="explicit_request", intent="refund", sentiment="negative",
        narrative="needs a human", suggested_resolution="issue refund",
        context_package={"narrative": "needs a human", "account": {"plan": "pro"}, "transcript": []},
        status="open",
    )
    db.add(h)
    db.commit()
    return h


def test_admin_lists_and_updates_handoff(db, client, monkeypatch):
    admin_client = _admin_client(db, client, monkeypatch)
    h = _seed_handoff(db)

    listing = admin_client.get("/api/v1/admin/handoffs", params={"status": "open"})
    assert listing.status_code == 200
    body = listing.json()
    assert body["counts"]["open"] >= 1
    assert any(item["id"] == h.id for item in body["items"])

    upd = admin_client.post(f"/api/v1/admin/handoffs/{h.id}", json={"status": "resolved", "admin_response": "Refunded."})
    assert upd.status_code == 200
    assert upd.json()["status"] == "resolved"
    db.refresh(h)
    assert h.resolved_at is not None
    assert h.admin_response == "Refunded."

def test_admin_handoff_rejects_bad_status(db, client, monkeypatch):
    admin_client = _admin_client(db, client, monkeypatch)
    h = _seed_handoff(db)
    bad = admin_client.post(f"/api/v1/admin/handoffs/{h.id}", json={"status": "bogus"})
    assert bad.status_code == 400

def test_admin_handoffs_require_admin(db, client):
    # no auth header -> 401
    assert client.get("/api/v1/admin/handoffs").status_code == 401


# ---------------------------------------------------------------------------
# Security fixes (#1-#4): PII purge, public budget fail-closed, session cap,
# prompt-injection hardening
# ---------------------------------------------------------------------------

def test_anonymize_chat_data_scrubs_org_pii(db):
    # #1: GDPR account purge must blank chat PII for the org but leave
    # unrelated anonymous sessions untouched.
    user = _user(db)
    org = _org(db, owner=user)
    sess = service.get_or_create_session(db, surface="app", session_id=None, org=org, user=user)
    db.add(ChatMessage(session_id=sess.id, role="user", content="my email is a@b.com"))
    visitor_sess = service.get_or_create_session(
        db, surface="public", session_id=None, visitor_id="keep-me"
    )
    db.add(ChatMessage(session_id=visitor_sess.id, role="user", content="public hello"))
    h = ChatHandoff(
        session_id=sess.id, org_id=org.id, user_id=user.id, surface="app",
        trigger="explicit_request", visitor_email="a@b.com", narrative="secret",
        suggested_resolution="secret", context_package={"account": {"plan": "pro"}}, status="open",
    )
    db.add(h)
    db.commit()

    scrubbed = service.anonymize_chat_data(db, org.id)
    db.commit()

    assert scrubbed == 1
    # org session + handoff scrubbed
    assert sess.visitor_email is None and sess.visitor_id is None and sess.page is None
    assert h.visitor_email is None and h.narrative == "[purged]"
    assert h.suggested_resolution is None and h.context_package is None
    for m in db.query(ChatMessage).filter(ChatMessage.session_id == sess.id).all():
        assert m.content == "[purged]" and m.meta is None
    # unrelated public session untouched
    assert visitor_sess.visitor_id == "keep-me"
    pub = db.query(ChatMessage).filter(ChatMessage.session_id == visitor_sess.id).all()
    assert pub[0].content == "public hello"


def test_public_session_message_cap(db, monkeypatch):
    # #4: an anonymous session rotates to a fresh id once it hits the cap, so a
    # single thread can't grow without bound.
    monkeypatch.setattr(service, "get_settings", lambda: SimpleNamespace(chat_public_max_messages=2))
    s1 = service.get_or_create_session(db, surface="public", session_id=None, visitor_id="v")
    db.commit()

    db.add(ChatMessage(session_id=s1.id, role="user", content="one"))
    db.commit()
    reused = service.get_or_create_session(db, surface="public", session_id=s1.id, visitor_id="v")
    assert reused.id == s1.id  # under the cap -> same session

    db.add(ChatMessage(session_id=s1.id, role="assistant", content="two"))
    db.commit()
    rotated = service.get_or_create_session(db, surface="public", session_id=s1.id, visitor_id="v")
    assert rotated.id != s1.id  # at the cap -> brand new session
    assert rotated.surface == "public" and rotated.visitor_id == "v"


def test_public_chat_fails_closed_when_redis_down(client, monkeypatch):
    # #2: the public budget fails CLOSED — a Redis outage must not leave an
    # unauthenticated, cost-bearing endpoint wide open.
    def boom():
        raise RuntimeError("redis down")

    monkeypatch.setattr("app.services.rate_limit.get_redis", boom)
    r = client.post("/api/v1/chat/public", json={"message": "hello", "visitor_id": "v"})
    assert r.status_code == 503


def test_system_prompt_flags_untrusted_input():
    # #3: prompt carries explicit anti-injection guidance.
    from app.services.chat import prompts

    assert "UNTRUSTED INPUT" in prompts.SYSTEM_PROMPT
    assert "prompt-injection" in prompts.SYSTEM_PROMPT


# ---------------------------------------------------------------------------
# Provider retry helper (#105): transient -> retry, terminal -> give up
# ---------------------------------------------------------------------------

def _mk_resp(status, *, body=None, text="", headers=None):
    return SimpleNamespace(
        status_code=status,
        headers=headers or {},
        text=text,
        json=lambda: body or {},
    )


class _FakeClient:
    """Stand-in for httpx.Client that replays scripted responses / raises."""

    def __init__(self, script):
        self._script = list(script)
        self.calls = 0

    def __call__(self, *a, **k):  # httpx.Client(timeout=...) returns instance
        return self

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def post(self, *a, **k):
        self.calls += 1
        item = self._script.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def test_retry_helper_retries_transient_then_succeeds(monkeypatch):
    from app.services.ai import _retry

    monkeypatch.setattr(_retry.time, "sleep", lambda *a, **k: None)
    fake = _FakeClient([
        _mk_resp(429, text="overloaded"),
        _mk_resp(200, body={"choices": [{"message": {"content": " hello "}}]}),
    ])
    monkeypatch.setattr(_retry.httpx, "Client", fake)
    out = _retry.post_chat_json(
        label="T", url="http://x", headers={}, payload={}, timeout=1, retries=1
    )
    assert out == "hello"
    assert fake.calls == 2


def test_retry_helper_does_not_retry_terminal_4xx(monkeypatch):
    from app.services.ai import _retry

    monkeypatch.setattr(_retry.time, "sleep", lambda *a, **k: None)
    fake = _FakeClient([_mk_resp(401, text="bad key")])
    monkeypatch.setattr(_retry.httpx, "Client", fake)
    out = _retry.post_chat_json(
        label="T", url="http://x", headers={}, payload={}, timeout=1, retries=2
    )
    assert out is None
    assert fake.calls == 1  # 401 is not transient


def test_retry_helper_retries_network_error(monkeypatch):
    from app.services.ai import _retry
    import httpx

    monkeypatch.setattr(_retry.time, "sleep", lambda *a, **k: None)
    fake = _FakeClient([
        httpx.ConnectError("boom"),
        _mk_resp(200, body={"choices": [{"message": {"content": "ok"}}]}),
    ])
    monkeypatch.setattr(_retry.httpx, "Client", fake)
    out = _retry.post_chat_json(
        label="T", url="http://x", headers={}, payload={}, timeout=1, retries=1
    )
    assert out == "ok"
    assert fake.calls == 2
