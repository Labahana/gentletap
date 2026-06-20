import pytest

from gentletap.services.whatsapp_inbound import handle_inbound_whatsapp


def test_inbound_rejects_non_shared_routing(db_session):
    with pytest.raises(ValueError, match="Could not route"):
        handle_inbound_whatsapp(
            db_session,
            from_phone="+15551111111",
            to_phone="+15552222222",
            body="Paid already",
            external_sid="SM-test-unscoped",
            routed_via="unknown",
        )
