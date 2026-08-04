"""Tests for auth token rotation security."""

from datetime import UTC, datetime, timedelta

from gentletap.database import Profile, RefreshToken
from gentletap.services.auth import (
    REFRESH_REUSE_GRACE,
    create_refresh_token,
    rotate_refresh_token,
)


def _make_user(db_session, email: str) -> Profile:
    user = Profile(email=email, password_hash="x", full_name="Token Test")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_refresh_token_reuse_within_grace_rotates_again(db_session, requires_db):
    """Concurrent tabs/retries present the same token twice — family must survive."""
    user = _make_user(db_session, "grace@test.dev")

    raw = create_refresh_token(db_session, user.id)
    first = rotate_refresh_token(db_session, raw)
    assert first is not None

    reused = rotate_refresh_token(db_session, raw)
    assert reused is not None


def test_refresh_token_reuse_after_grace_revokes_family(db_session, requires_db):
    """Replaying a long-used token is theft — the whole family must die."""
    user = _make_user(db_session, "reuse@test.dev")

    raw = create_refresh_token(db_session, user.id)
    first = rotate_refresh_token(db_session, raw)
    assert first is not None

    token_row = (
        db_session.query(RefreshToken)
        .filter(RefreshToken.user_id == user.id, RefreshToken.used.is_(True))
        .first()
    )
    token_row.used_at = datetime.now(UTC) - REFRESH_REUSE_GRACE - timedelta(seconds=1)
    db_session.commit()

    reused = rotate_refresh_token(db_session, raw)
    assert reused is None

    family_id = (
        db_session.query(RefreshToken)
        .filter(RefreshToken.user_id == user.id)
        .first()
        .family_id
    )
    active = (
        db_session.query(RefreshToken)
        .filter(RefreshToken.family_id == family_id, RefreshToken.used.is_(False))
        .count()
    )
    assert active == 0


def test_refresh_token_valid_rotation(db_session, requires_db):
    user = _make_user(db_session, "rotate@test.dev")

    raw = create_refresh_token(db_session, user.id)
    pair = rotate_refresh_token(db_session, raw)
    assert pair is not None
    access, new_refresh = pair
    assert access
    assert new_refresh

    second = rotate_refresh_token(db_session, new_refresh)
    assert second is not None
