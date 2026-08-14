"""Team seats: list, invite, accept, remove, roles, and account audit."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import AccountAuditEvent, Profile, get_db
from gentletap.dependencies import CurrentUser
from gentletap.plans import has_team_seats
from gentletap.services.account_audit import record_event
from gentletap.services import team as team_service
from gentletap.services.platform_email import send_platform_email

router = APIRouter(prefix="/team", tags=["team"])


class InviteBody(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: str = Field(default="member", pattern="^(member|viewer)$")


class AcceptBody(BaseModel):
    token: str = Field(min_length=16, max_length=128)


def _account(db: Session, user: Profile) -> Profile:
    account_id = team_service.account_id_for(user)
    account = db.query(Profile).filter(Profile.id == account_id).one_or_none()
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    return account


@router.get("")
def team_overview(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    account = _account(db, user)
    account_id = account.id
    return {
        "account_id": str(account_id),
        "account_email": account.email,
        "plan": account.plan,
        "seats_enabled": has_team_seats(account.plan),
        "role": team_service.role_for(user),
        "members": team_service.list_members(db, account_id),
        "invites": team_service.list_invites(db, account_id),
    }


@router.post("/invites", status_code=status.HTTP_201_CREATED)
def create_invite(body: InviteBody, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    team_service.require_role(user, "member")
    account = _account(db, user)
    if not has_team_seats(account.plan):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Team seats require the Team plan",
        )
    email = body.email.strip().lower()
    if email == account.email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="That's the account owner")

    invite, token = team_service.create_invite(
        db, account=account, inviter=user, email=email, role=body.role
    )
    settings = get_settings()
    accept_url = f"{settings.web_url.rstrip('/')}/team/accept?token={token}"
    send_platform_email(
        to=email,
        subject=f"You're invited to join {account.company_name or account.email} on GentleTap",
        plain=(
            f"{user.full_name or user.email} invited you to collaborate on GentleTap as a {body.role}.\n\n"
            f"Accept: {accept_url}\n\nThis invite expires in 7 days."
        ),
        html="",
    )
    record_event(
        db,
        account_id=account.id,
        actor_user_id=user.id,
        action="team.invite_created",
        metadata={"email": email, "role": body.role},
    )
    db.commit()
    return {
        "id": str(invite.id),
        "email": invite.email,
        "role": invite.role,
        "accept_url": accept_url,
    }


@router.post("/invites/accept")
def accept_invite(body: AcceptBody, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    member = team_service.accept_invite(db, user=user, token=body.token)
    if member is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite is invalid or expired")
    record_event(
        db,
        account_id=member.account_id,
        actor_user_id=user.id,
        action="team.invite_accepted",
        metadata={"role": member.role},
    )
    db.commit()
    return {"joined": True, "account_id": str(member.account_id), "role": member.role}


@router.delete("/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(member_user_id: str, user: CurrentUser, db: Session = Depends(get_db)) -> None:
    team_service.require_role(user, "owner")
    account = _account(db, user)
    if str(user.id) == member_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Owners can't remove themselves")
    ok = team_service.remove_member(db, account_id=account.id, user_id=UUID(member_user_id))
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    record_event(
        db,
        account_id=account.id,
        actor_user_id=user.id,
        action="team.member_removed",
        metadata={"user_id": member_user_id},
    )
    db.commit()


@router.get("/audit")
def team_audit(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    team_service.require_role(user, "member")
    account = _account(db, user)
    rows = (
        db.query(AccountAuditEvent)
        .filter(AccountAuditEvent.account_id == account.id)
        .order_by(AccountAuditEvent.created_at.desc())
        .limit(100)
        .all()
    )
    return {
        "items": [
            {
                "id": str(e.id),
                "action": e.action,
                "actor_user_id": str(e.actor_user_id) if e.actor_user_id else None,
                "metadata": e.metadata_json,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in rows
        ]
    }
