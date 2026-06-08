from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from gentletap.database import Profile, get_db
from gentletap.dependencies import CurrentUser
from gentletap.schemas.auth import (
    LoginRequest,
    OnboardingPersonaRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from gentletap.services.auth import (
    authenticate_user,
    create_access_token,
    hash_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)) -> TokenResponse:
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

    token = create_access_token(user.id)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = authenticate_user(db, body.email, body.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)
