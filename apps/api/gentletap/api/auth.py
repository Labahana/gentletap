from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from gentletap.database import Profile, get_db
from gentletap.dependencies import CurrentUser
from gentletap.rate_limit import limiter
from gentletap.schemas.auth import (
    LoginRequest,
    OnboardingPersonaRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from gentletap.services.auth import (
    authenticate_user,
    hash_password,
    issue_token_pair,
    revoke_refresh_family,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
    email = body.email.lower()
    if db.query(Profile).filter(Profile.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = Profile(
        email=email,
        password_hash=hash_password(body.password),
        full_name=body.full_name,
        onboarding_step="quickbooks",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    access, refresh = issue_token_pair(db, user)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    access, refresh = issue_token_pair(db, user)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("30/minute")
def refresh(request: Request, body: RefreshRequest, db: Session = Depends(get_db)) -> TokenResponse:
    pair = rotate_refresh_token(db, body.refresh_token)
    if pair is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    access, refresh = pair
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout")
def logout(body: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    revoke_refresh_family(db, body.refresh_token)
    return {"status": "logged_out"}


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)
