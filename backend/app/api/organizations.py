from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.schemas.organization import OrganizationOut, OrganizationUpdate
from app.models.organization import Organization

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("/me", response_model=OrganizationOut)
def get_current_organization(user_and_org=Depends(get_current_user_and_org)):
    _, org = user_and_org
    return org


@router.patch("/me", response_model=OrganizationOut)
def update_organization(
    req: OrganizationUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    if req.name:
        org.name = req.name
    db.commit()
    db.refresh(org)
    return org
