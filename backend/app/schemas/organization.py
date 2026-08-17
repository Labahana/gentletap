from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class OrganizationOut(BaseModel):
    id: str
    name: str
    owner_user_id: str
    plan: str
    seats_limit: int
    created_at: datetime

    class Config:
        from_attributes = True


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
