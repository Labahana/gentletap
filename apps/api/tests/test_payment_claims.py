from gentletap.services.payment_claims import is_payment_claim


def test_payment_claim_detection():
    assert is_payment_claim("I paid yesterday")
    assert is_payment_claim("Payment sent via wire")
    assert is_payment_claim("Just transferred the money")
    assert is_payment_claim("I've paid in full")


def test_non_payment_reply():
    assert not is_payment_claim("Can I get an extension?")
    assert not is_payment_claim("Wrong amount on the invoice")
    assert not is_payment_claim("Thanks")
