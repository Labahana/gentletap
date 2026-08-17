from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.models.organization import Organization

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: str, org_id: str, email: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "email": email,
        "type": "access",
        "exp": expires,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(user_id: str, org_id: str) -> str:
    expires = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": user_id,
        "org_id": org_id,
        "type": "refresh",
        "exp": expires,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_and_org(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Tuple[User, Organization]:
    if not token:
        # Check if there is a dev default fallback user/org in DB, or create one for easy testing
        user = db.query(User).first()
        org = db.query(Organization).first()
        if not user:
            user = User(
                email="demo@gentletap.com",
                password_hash=hash_password("password123"),
                full_name="Demo User",
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        if not org:
            org = Organization(
                name="GentleTap Agency",
                owner_user_id=user.id,
                plan="free",
            )
            db.add(org)
            db.commit()
            db.refresh(org)

        return (user, org)

    payload = decode_token(token)
    user_id = payload.get("sub")
    org_id = payload.get("org_id")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        org = db.query(Organization).filter(Organization.owner_user_id == user.id).first()
        if not org:
            org = Organization(name=f"{user.full_name or 'User'}'s Org", owner_user_id=user.id, plan="free")
            db.add(org)
            db.commit()
            db.refresh(org)

    return (user, org)
