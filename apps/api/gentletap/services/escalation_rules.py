"""User-defined escalation rules evaluated against overdue invoices."""

from sqlalchemy.orm import Session

from gentletap.database import EscalationRule


def list_rules(db: Session, user_id) -> list[EscalationRule]:
    return (
        db.query(EscalationRule)
        .filter(EscalationRule.user_id == user_id)
        .order_by(EscalationRule.position.asc(), EscalationRule.created_at.asc())
        .all()
    )


def default_rules() -> list[dict]:
    return [
        {
            "name": "Very overdue",
            "enabled": True,
            "conditions": {"days_overdue_gte": 21},
            "actions": {"notify": True, "pause_sequence": False, "email": False},
        },
        {
            "name": "High value & late",
            "enabled": True,
            "conditions": {"days_overdue_gte": 14, "amount_gte": 10000},
            "actions": {"notify": True, "pause_sequence": False, "email": False},
        },
    ]


def rule_matches(rule: EscalationRule, *, invoice) -> bool:
    cond = rule.conditions or {}
    if "days_overdue_gte" in cond and invoice.days_overdue < int(cond["days_overdue_gte"]):
        return False
    if "amount_gte" in cond and float(invoice.balance) < float(cond["amount_gte"]):
        return False
    if "min_step_gte" in cond and invoice.sequence_step < int(cond["min_step_gte"]):
        return False
    return True


def evaluate_rules(db: Session, user_id, *, invoice) -> list[EscalationRule]:
    return [r for r in list_rules(db, user_id) if r.enabled and rule_matches(r, invoice=invoice)]
