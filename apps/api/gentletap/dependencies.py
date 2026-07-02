from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from gentletap.database import Affiliate, Profile, get_db
from gentletap.services.admin_security import assert_admin_access
from gentletap.services.affiliate_auth import get_affiliate_from_token
from gentletap.services.auth import get_user_from_token

security = HTTPBearer(auto_error=False)


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> Profile:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = get_user_from_token(db, credentials.credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


CurrentUser = Annotated[Profile, Depends(get_current_user)]


def get_admin_user(
    request: Request,
    user: Annotated[Profile, Depends(get_current_user)],
) -> Profile:
    assert_admin_access(request, user)
    return user


AdminUser = Annotated[Profile, Depends(get_admin_user)]


def get_current_affiliate(
    db: Annotated[Session, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
) -> Affiliate:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    affiliate = get_affiliate_from_token(db, credentials.credentials)
    if affiliate is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if affiliate.status != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Affiliate account not active")
    return affiliate


CurrentAffiliate = Annotated[Affiliate, Depends(get_current_affiliate)]
