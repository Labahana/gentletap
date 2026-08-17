from fastapi import APIRouter, Depends
from app.api.deps import get_current_user_and_org
from app.models.user import User
from app.models.organization import Organization

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
def get_me(user_and_org=Depends(get_current_user_and_org)):
    user, org = user_and_org
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "organization_id": org.id,
        "organization_name": org.name,
        "plan": org.plan,
    }
