from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from urllib.parse import quote

from gentletap.config import get_settings
from gentletap.database import Profile, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.account_lifecycle import delete_user_account, export_user_data
from gentletap.integrations.google import auth_signin
from gentletap.integrations.google.oauth import is_configured as google_oauth_configured
from gentletap.rate_limit import limiter
from gentletap.schemas.auth import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    GoogleExchangeRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserResponse,
)
from gentletap.services.auth import (
    authenticate_user,
    hash_password,
    issue_token_pair,
    revoke_refresh_family,
    rotate_refresh_token,
)
from gentletap.services.password_reset import request_password_reset, reset_password

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
        onboarding_step="account",
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


@router.get("/google/url")
def google_signin_url(intent: str = Query("signup", pattern="^(signup|login)$")) -> dict:
    if not google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured",
        )
    try:
        url = auth_signin.create_signin_authorization_url(intent=intent)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"authorization_url": url}


@router.get("/google/callback")
def google_signin_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    settings = get_settings()
    try:
        exchange_code = auth_signin.handle_signin_callback(db, code=code, state=state)
    except ValueError as exc:
        return RedirectResponse(
            url=f"{settings.web_url}/login?google=error&message={quote(str(exc))}",
            status_code=status.HTTP_302_FOUND,
        )
    return RedirectResponse(
        url=f"{settings.web_url}/auth/google/complete?code={exchange_code}",
        status_code=status.HTTP_302_FOUND,
    )


@router.post("/google/exchange", response_model=TokenResponse)
@limiter.limit("20/minute")
def google_signin_exchange(
    request: Request,
    body: GoogleExchangeRequest,
    db: Session = Depends(get_db),
) -> TokenResponse:
    try:
        _user, access, refresh = auth_signin.exchange_signin_code(db, body.code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, body: ForgotPasswordRequest, db: Session = Depends(get_db)) -> dict:
    request_password_reset(db, body.email)
    return {
        "message": "If an account exists for that email, we sent a password reset link.",
    }


@router.post("/reset-password")
@limiter.limit("10/minute")
def reset_password_endpoint(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
) -> dict:
    try:
        reset_password(db, token=body.token, new_password=body.password)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"message": "Password updated. You can log in with your new password."}


@router.get("/me", response_model=UserResponse)
def me(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)


@router.patch("/me", response_model=UserResponse)
def update_profile(
    body: UpdateProfileRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> UserResponse:
    if body.full_name is not None:
        user.full_name = body.full_name.strip() or None
    if body.persona is not None:
        user.persona = body.persona
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    user.password_hash = hash_password(body.password)
    db.commit()
    return {"message": "Password updated."}


class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(..., min_length=1)


@router.get("/me/export")
def export_account_data(user: CurrentUser, db: Session = Depends(get_db)) -> JSONResponse:
    payload = export_user_data(db, user.id)
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": 'attachment; filename="gentletap-data-export.json"'},
    )


@router.post("/delete-account")
@limiter.limit("3/hour")
def delete_account(
    request: Request,
    body: DeleteAccountRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    if body.confirmation.strip().upper() != "DELETE":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Type DELETE in the confirmation field to permanently delete your account.',
        )
    delete_user_account(db, user.id)
    return {"message": "Your account and associated data have been permanently deleted."}
