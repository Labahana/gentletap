"""Unit tests for user-defined escalation rules."""

from gentletap.database import EscalationRule
from gentletap.services.escalation_rules import default_rules, rule_matches


class _Invoice:
    def __init__(self, days_overdue=0, balance=0, sequence_step=0):
        self.days_overdue = days_overdue
        self.balance = balance
        self.sequence_step = sequence_step


def _rule(conditions):
    return EscalationRule(name="r", enabled=True, conditions=conditions, actions={})


def test_default_rules_shape():
    rules = default_rules()
    assert len(rules) == 2
    assert rules[0]["conditions"]["days_overdue_gte"] == 21
    assert rules[1]["conditions"]["amount_gte"] == 10000


def test_rule_matches_days_overdue():
    rule = _rule({"days_overdue_gte": 21})
    assert rule_matches(rule, invoice=_Invoice(days_overdue=21)) is True
    assert rule_matches(rule, invoice=_Invoice(days_overdue=20)) is False


def test_rule_matches_amount():
    rule = _rule({"amount_gte": 1000})
    assert rule_matches(rule, invoice=_Invoice(balance=1000)) is True
    assert rule_matches(rule, invoice=_Invoice(balance=999.99)) is False


def test_rule_matches_min_step():
    rule = _rule({"min_step_gte": 2})
    assert rule_matches(rule, invoice=_Invoice(sequence_step=2)) is True
    assert rule_matches(rule, invoice=_Invoice(sequence_step=1)) is False


def test_rule_matches_combined():
    rule = _rule({"days_overdue_gte": 14, "amount_gte": 5000, "min_step_gte": 1})
    assert rule_matches(rule, invoice=_Invoice(days_overdue=14, balance=6000, sequence_step=1)) is True
    assert rule_matches(rule, invoice=_Invoice(days_overdue=14, balance=4000, sequence_step=1)) is False
    assert rule_matches(rule, invoice=_Invoice(days_overdue=13, balance=6000, sequence_step=1)) is False
