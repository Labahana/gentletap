"""Public endpoints — plans & waitlist."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.waitlist import WaitlistEntry
from app.services.paddle import public_plans

router = APIRouter(prefix="/public", tags=["Public"])


class WaitlistRequest(BaseModel):
    email: EmailStr
    provider: str = "xero"


@router.get("/plans")
def list_plans():
    return {"plans": public_plans()}


@router.post("/waitlist")
def join_waitlist(req: WaitlistRequest, db: Session = Depends(get_db)):
    existing = (
        db.query(WaitlistEntry)
        .filter(WaitlistEntry.email == req.email.lower(), WaitlistEntry.provider == req.provider)
        .first()
    )
    if not existing:
        db.add(WaitlistEntry(email=req.email.lower(), provider=req.provider))
        db.commit()
    return {"status": "ok", "message": "You're on the list!"}
