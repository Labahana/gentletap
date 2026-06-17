import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Profile, RefreshToken

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = get_settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(subject: str | UUID, extra: dict[str, Any] | None = None) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": str(subject), "exp": expire, "type": "access"}
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_refresh_token(db: Session, user_id: UUID) -> str:
    raw = secrets.token_urlsafe(48)
    family_id = uuid4()
    expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=_hash_token(raw),
            family_id=family_id,
            expires_at=expires,
        )
    )
    db.commit()
    return raw


def rotate_refresh_token(db: Session, raw_token: str) -> tuple[str, str] | None:
    token_hash = _hash_token(raw_token)
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).one_or_none()
    if row is None:
        return None
    if row.used or row.expires_at < datetime.now(UTC):
        if row.used:
            db.query(RefreshToken).filter(RefreshToken.family_id == row.family_id).update({"used": True})
            db.commit()
        return None
    row.used = True
    user_id = row.user_id
    family_id = row.family_id
    new_raw = secrets.token_urlsafe(48)
    expires = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=_hash_token(new_raw),
            family_id=family_id,
            expires_at=expires,
        )
    )
    db.commit()
    access = create_access_token(user_id)
    return access, new_raw


def revoke_refresh_family(db: Session, raw_token: str) -> None:
    token_hash = _hash_token(raw_token)
    row = db.query(RefreshToken).filter(RefreshToken.token_hash == token_hash).one_or_none()
    if row is None:
        return
    db.query(RefreshToken).filter(RefreshToken.family_id == row.family_id).update({"used": True})
    db.commit()


def decode_access_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


def authenticate_user(db: Session, email: str, password: str) -> Profile | None:
    user = db.query(Profile).filter(Profile.email == email.lower()).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def get_user_by_id(db: Session, user_id: UUID) -> Profile | None:
    return db.query(Profile).filter(Profile.id == user_id).first()


def get_user_from_token(db: Session, token: str) -> Profile | None:
    try:
        payload = decode_access_token(token)
        if payload.get("type") != "access":
            return None
        user_id = UUID(payload["sub"])
    except (JWTError, ValueError, KeyError):
        return None
    return get_user_by_id(db, user_id)


def issue_token_pair(db: Session, user: Profile) -> tuple[str, str]:
    access = create_access_token(user.id)
    refresh = create_refresh_token(db, user.id)
    return access, refresh
