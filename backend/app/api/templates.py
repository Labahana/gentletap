from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.template import Template
from app.schemas.template import (
    TemplateCreate,
    TemplateUpdate,
    TemplateOut,
    AIGenerateRequest,
    AIGenerateResponse,
)
from app.services.ai.kimi import generate_template_with_kimi

router = APIRouter(prefix="/templates", tags=["Templates"])


@router.get("", response_model=List[TemplateOut])
def list_templates(
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    query = db.query(Template).filter(Template.org_id == org.id)

    if q:
        query = query.filter(Template.name.ilike(f"%{q}%") | Template.subject.ilike(f"%{q}%"))

    query = query.order_by(Template.created_at.desc())
    offset = (page - 1) * page_size
    return query.offset(offset).limit(page_size).all()


@router.get("/{id}", response_model=TemplateOut)
def get_template_detail(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    template = db.query(Template).filter(Template.id == id, Template.org_id == org.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("", response_model=TemplateOut)
def create_template(
    req: TemplateCreate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    template = Template(
        org_id=org.id,
        name=req.name,
        tone=req.tone,
        subject=req.subject,
        body=req.body,
        is_default=req.is_default,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


@router.patch("/{id}", response_model=TemplateOut)
def update_template(
    id: str,
    req: TemplateUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    template = db.query(Template).filter(Template.id == id, Template.org_id == org.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if req.name is not None: template.name = req.name
    if req.tone is not None: template.tone = req.tone
    if req.subject is not None: template.subject = req.subject
    if req.body is not None: template.body = req.body
    if req.is_default is not None: template.is_default = req.is_default

    db.commit()
    db.refresh(template)
    return template


@router.delete("/{id}")
def delete_template(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    template = db.query(Template).filter(Template.id == id, Template.org_id == org.id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"message": "Template deleted successfully"}


@router.post("/generate-ai", response_model=AIGenerateResponse)
def generate_ai_draft(req: AIGenerateRequest):
    draft = generate_template_with_kimi(
        tone=req.tone,
        context=req.context,
        client_name=req.client_name,
        invoice_number=req.invoice_number,
        amount=req.amount,
    )
    return AIGenerateResponse(
        subject=draft["subject"],
        body=draft["body"],
        tone=req.tone,
    )
