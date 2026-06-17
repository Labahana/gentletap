from gentletap.plans import (
    WHATSAPP_MAX_SEQUENCE_STEP,
    WHATSAPP_MONTHLY_LIMITS,
    has_whatsapp,
    whatsapp_monthly_limit,
    whatsapp_step_eligible,
)


def test_whatsapp_monthly_limits():
    assert whatsapp_monthly_limit("pro_plus") == 450
    assert whatsapp_monthly_limit("team") == 850
    assert whatsapp_monthly_limit("pro") == 0
    assert WHATSAPP_MONTHLY_LIMITS["pro_plus"] == 450


def test_whatsapp_step_eligibility():
    assert whatsapp_step_eligible(0) is False
    assert whatsapp_step_eligible(1) is True
    assert whatsapp_step_eligible(3) is True
    assert whatsapp_step_eligible(4) is False
    assert WHATSAPP_MAX_SEQUENCE_STEP == 3


def test_has_whatsapp_plans():
    assert has_whatsapp("pro_plus")
    assert has_whatsapp("team")
    assert not has_whatsapp("pro")
