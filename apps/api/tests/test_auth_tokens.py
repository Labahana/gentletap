"""Tests for auth token rotation security."""

from gentletap.database import Profile, RefreshToken
from gentletap.services.auth import create_refresh_token, rotate_refresh_token


def test_refresh_token_reuse_revokes_family(db_session, requires_db):
    user = Profile(
        email="reuse@test.dev",
        password_hash="x",
        full_name="Reuse Test",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    raw = create_refresh_token(db_session, user.id)
    first = rotate_refresh_token(db_session, raw)
    assert first is not None

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
    user = Profile(
        email="rotate@test.dev",
        password_hash="x",
        full_name="Rotate Test",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    raw = create_refresh_token(db_session, user.id)
    pair = rotate_refresh_token(db_session, raw)
    assert pair is not None
    access, new_refresh = pair
    assert access
    assert new_refresh

    second = rotate_refresh_token(db_session, new_refresh)
    assert second is not None
