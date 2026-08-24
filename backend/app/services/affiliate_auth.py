"""Affiliate JWT auth (separate from user auth)."""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from uuid import uuid4

import jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.api.deps import hash_password, verify_password
from app.models.affiliate import Affiliate, AffiliateRefreshToken

settings = get_settings()

# Duplicate-refresh-delivery grace window (matches main auth behavior).
REFRESH_REUSE_GRACE = timedelta(seconds=30)


def create_affiliate_access_token(affiliate_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {
        "sub": affiliate_id,
        "type": "affiliate_access",
        "exp": expires,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_affiliate_refresh_token(db: Session, affiliate_id: str) -> str:
    raw = secrets.token_urlsafe(48)
    family_id = str(uuid4())
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
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


def issue_affiliate_token_pair(db: Session, affiliate: Affiliate) -> Tuple[str, str]:
    access = create_affiliate_access_token(affiliate.id)
    refresh = create_affiliate_refresh_token(db, affiliate.id)
    return access, refresh


def authenticate_affiliate(db: Session, email: str, password: str) -> Optional[Affiliate]:
    row = db.query(Affiliate).filter(Affiliate.email == email.lower()).first()
    if not row or not verify_password(password, row.password_hash):
        return None
    return row


def get_affiliate_from_token(db: Session, token: str) -> Optional[Affiliate]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "affiliate_access":
            return None
        affiliate_id = payload["sub"]
    except (jwt.PyJWTError, ValueError, KeyError):
        return None
    return db.query(Affiliate).filter(Affiliate.id == affiliate_id).one_or_none()


def rotate_affiliate_refresh_token(db: Session, raw_token: str) -> Optional[Tuple[str, str]]:
    token_hash = _hash_token(raw_token)
    row = (
        db.query(AffiliateRefreshToken)
        .filter(AffiliateRefreshToken.token_hash == token_hash)
        .one_or_none()
    )
    if row is None:
        return None
    now = datetime.now(timezone.utc)
    if row.expires_at < now:
        return None
    if row.used:
        in_grace = row.used_at is not None and (now - row.used_at) <= REFRESH_REUSE_GRACE
        if not in_grace:
            # Replayed refresh outside the grace window — kill the whole family.
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
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
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
