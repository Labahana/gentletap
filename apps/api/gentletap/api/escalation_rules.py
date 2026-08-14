"""User escalation rules API."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gentletap.database import EscalationRule, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.escalation_rules import list_rules

router = APIRouter(prefix="/escalation-rules", tags=["escalation-rules"])


class RuleBody(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    enabled: bool = True
    conditions: dict = Field(default_factory=dict)
    actions: dict = Field(default_factory=dict)
    position: int = 0


def _serialize(rule: EscalationRule) -> dict:
    return {
        "id": str(rule.id),
        "name": rule.name,
        "enabled": rule.enabled,
        "conditions": rule.conditions,
        "actions": rule.actions,
        "position": rule.position,
    }


@router.get("")
def read_rules(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    return {"items": [_serialize(r) for r in list_rules(db, user.id)]}


MAX_RULES_PER_USER = 25


@router.post("", status_code=status.HTTP_201_CREATED)
def create_rule(body: RuleBody, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if len(list_rules(db, user.id)) >= MAX_RULES_PER_USER:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Maximum of {MAX_RULES_PER_USER} rules reached",
        )
    rule = EscalationRule(
        user_id=user.id,
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
def update_rule(rule_id: UUID, body: RuleBody, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    rule = (
        db.query(EscalationRule)
        .filter(EscalationRule.id == rule_id, EscalationRule.user_id == user.id)
        .one_or_none()
    )
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    rule.name = body.name.strip()
    rule.enabled = body.enabled
    rule.conditions = body.conditions
    rule.actions = body.actions
    rule.position = body.position
    db.commit()
    db.refresh(rule)
    return _serialize(rule)


@router.delete("/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_rule(rule_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> None:
    rule = (
        db.query(EscalationRule)
        .filter(EscalationRule.id == rule_id, EscalationRule.user_id == user.id)
        .one_or_none()
    )
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rule not found")
    db.delete(rule)
    db.commit()
