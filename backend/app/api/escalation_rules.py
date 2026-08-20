"""Org escalation rules API (CRUD)."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.escalation_rule import EscalationRule

router = APIRouter(prefix="/escalation-rules", tags=["Escalation Rules"])

MAX_RULES_PER_ORG = 25


class RuleBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    enabled: bool = True
    conditions: dict = Field(default_factory=dict)
    actions: dict = Field(default_factory=dict)
    position: int = 0


def _serialize(rule: EscalationRule) -> dict:
    return {
        "id": rule.id,
        "name": rule.name,
        "enabled": rule.enabled,
        "conditions": rule.conditions or {},
        "actions": rule.actions or {},
        "position": rule.position,
    }


def _list_rules(db: Session, org_id: str):
    return (
        db.query(EscalationRule)
        .filter(EscalationRule.org_id == org_id)
        .order_by(EscalationRule.position.asc(), EscalationRule.created_at.asc())
        .all()
    )


@router.get("")
def read_rules(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)) -> dict:
    _, org = user_and_org
    return {"items": [_serialize(r) for r in _list_rules(db, org.id)]}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_rule(body: RuleBody, user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)) -> dict:
    _, org = user_and_org
    if len(_list_rules(db, org.id)) >= MAX_RULES_PER_ORG:
        raise HTTPException(status_code=409, detail=f"Maximum of {MAX_RULES_PER_ORG} rules reached")
    rule = EscalationRule(
        org_id=org.id,
        name=body.name.strip(),
        enabled=body.enabled,
        conditions=body.conditions,
        actions=body.actions,
        position=body.position,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return _serialize(rule)


@router.patch("/{rule_id}")
def update_rule(rule_id: str, body: RuleBody, user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)) -> dict:
    _, org = user_and_org
    rule = (
        db.query(EscalationRule)
        .filter(EscalationRule.id == rule_id, EscalationRule.org_id == org.id)
        .one_or_none()
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    rule.name = body.name.strip()
    rule.enabled = body.enabled
    rule.conditions = body.conditions
    rule.actions = body.actions
    rule.position = body.position
    db.commit()
    db.refresh(rule)
    return _serialize(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: str, user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)) -> None:
    _, org = user_and_org
    rule = (
        db.query(EscalationRule)
        .filter(EscalationRule.id == rule_id, EscalationRule.org_id == org.id)
        .one_or_none()
    )
    if rule is None:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()
