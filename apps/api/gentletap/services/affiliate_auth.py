"""Affiliate JWT auth (separate from user auth)."""

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from jose import JWTError
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Affiliate, AffiliateRefreshToken
from gentletap.services.auth import (
    REFRESH_REUSE_GRACE,
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)

settings = get_settings()


def create_affiliate_access_token(affiliate_id: UUID) -> str:
    return create_access_token(affiliate_id, extra={"type": "affiliate_access"})


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_affiliate_refresh_token(db: Session, affiliate_id: UUID) -> str:
    raw = secrets.token_urlsafe(48)
    family_id = uuid4()
    expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        AffiliateRefreshToken(
            affiliate_id=affiliate_id,
            token_hash=_hash_token(raw),
            family_id=family_id,
            expires_at=expires,
        )
    )
    db.commit()
    return raw


def issue_affiliate_token_pair(db: Session, affiliate: Affiliate) -> tuple[str, str]:
    access = create_affiliate_access_token(affiliate.id)
    refresh = create_affiliate_refresh_token(db, affiliate.id)
    return access, refresh


def authenticate_affiliate(db: Session, email: str, password: str) -> Affiliate | None:
    row = db.query(Affiliate).filter(Affiliate.email == email.lower()).first()
    if not row or not verify_password(password, row.password_hash):
        return None
    return row


def get_affiliate_from_token(db: Session, token: str) -> Affiliate | None:
    try:
        payload = decode_access_token(token)
        if payload.get("type") != "affiliate_access":
            return None
        affiliate_id = UUID(payload["sub"])
    except (JWTError, ValueError, KeyError):
        return None
    return db.query(Affiliate).filter(Affiliate.id == affiliate_id).one_or_none()


def rotate_affiliate_refresh_token(db: Session, raw_token: str) -> tuple[str, str] | None:
    token_hash = _hash_token(raw_token)
    row = db.query(AffiliateRefreshToken).filter(AffiliateRefreshToken.token_hash == token_hash).one_or_none()
    if row is None:
        return None
    now = datetime.now(UTC)
    if row.expires_at < now:
        return None
    if row.used:
        in_grace = row.used_at is not None and (now - row.used_at) <= REFRESH_REUSE_GRACE
        if not in_grace:
            db.query(AffiliateRefreshToken).filter(
                AffiliateRefreshToken.family_id == row.family_id
            ).update({"used": True})
            db.commit()
            return None
        # Duplicate delivery within the grace window — rotate again instead of
        # killing the family.
    row.used = True
    row.used_at = now
    affiliate_id = row.affiliate_id
    family_id = row.family_id
    new_raw = secrets.token_urlsafe(48)
    expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        AffiliateRefreshToken(
            affiliate_id=affiliate_id,
            token_hash=_hash_token(new_raw),
            family_id=family_id,
            expires_at=expires,
        )
    )
    db.commit()
    return create_affiliate_access_token(affiliate_id), new_raw


def hash_affiliate_password(password: str) -> str:
    return hash_password(password)
