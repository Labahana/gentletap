"""Client profile and preference endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.client import Client
from app.schemas.client_profile import ClientProfileOut, ClientPreferencesUpdate
from app.services.client_profile import get_or_create_profile, recompute_client_profile, update_preferences

router = APIRouter(prefix="/clients", tags=["Client Profiles"])


@router.get("/{id}/profile", response_model=ClientProfileOut)
def get_client_profile(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    client = db.query(Client).filter(Client.id == id, Client.org_id == org.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    profile = recompute_client_profile(db, client.id, org.id)
    db.commit()
    db.refresh(profile)
    return profile


@router.patch("/{id}/preferences", response_model=ClientProfileOut)
def patch_client_preferences(
    id: str,
    req: ClientPreferencesUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    client = db.query(Client).filter(Client.id == id, Client.org_id == org.id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    profile = update_preferences(
        db,
        client.id,
        org.id,
        channel_pref=req.channel_pref,
        tone_pref=req.tone_pref,
        best_send_time=req.best_send_time,
    )
    db.commit()
    db.refresh(profile)
    return profile
