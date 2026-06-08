from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Profile

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
