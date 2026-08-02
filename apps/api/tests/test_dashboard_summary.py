from unittest.mock import MagicMock, patch
from uuid import uuid4

from gentletap.database import Invoice, Profile
from gentletap.services.dashboard_data import build_invoices_summary


@patch("gentletap.services.invoice_source.source_counts_for_user", return_value={"quickbooks_count": 0, "freshbooks_count": 0, "upload_count": 0, "upload_needs_attention": 0})
@patch("gentletap.services.dashboard_data.build_activity_feed", return_value=[])
@patch("gentletap.services.dashboard_data.build_summary_extras")
@patch("gentletap.services.plan_limits.free_plan_collection_usage", return_value=None)
def test_build_invoices_summary_passes_profile_to_plan_usage(
    usage_mock,
    extras_mock,
    _activity_mock,
    _sources_mock,
):
    user_id = uuid4()
    user = MagicMock()
    user.id = user_id
    user.plan = "pro"

    extras_mock.return_value = {
        "collected_this_month": 0.0,
        "expected_this_week": 0.0,
        "expected_this_week_count": 0,
        "avg_days_to_pay": None,
        "reminders_sent_this_month": 0,
        "collection_rate": 0,
        "response_rate": None,
        "time_saved_hours": 0.0,
        "time_saved_value": 0.0,
        "last_action": None,
        "featured_escalation": None,
        "collected_mom_pct": None,
        "avg_payment_days": None,
        "avg_payment_days_mom": None,
    }

    invoice_q = MagicMock()
    invoice_q.filter.return_value.scalar.return_value = 0
    invoice_q.filter.return_value.first.return_value = (0, 0)
    invoice_q.filter.return_value.one.return_value = (0, 0)

    profile_q = MagicMock()
    profile_q.filter.return_value.one.return_value = user

    def query_side_effect(model, *_args):
        if model is Profile:
            return profile_q
        if model is Invoice:
            return invoice_q
        # func.count / multi-column queries used by aging buckets
        return invoice_q

    db = MagicMock()
    db.query.side_effect = query_side_effect

    build_invoices_summary(db, user_id)

    usage_mock.assert_called_once_with(db, user)
