import { LegalEntityBlock } from "@/components/legal-entity-block";
import { LegalLayout } from "@/components/legal-layout";
import { LEGAL } from "@/lib/legal";

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" updated="June 18, 2026">
      <p>
        This Refund Policy applies to paid subscriptions and one-time purchases for {LEGAL.productName},
        processed by {LEGAL.paddleMoR} (&quot;Paddle&quot;) as Merchant of Record.
      </p>

      <LegalEntityBlock />

      <h2>{LEGAL.refundWindowDays}-day money-back guarantee</h2>
      <p>
        If you are not satisfied with a paid {LEGAL.productName} subscription, you may request a{" "}
        <strong>full refund within {LEGAL.refundWindowDays} days</strong> of your initial purchase or
        upgrade to a new paid plan. No reason required.
      </p>
      <p>
        To request a refund, email{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> from your account email with
        your Paddle receipt or transaction ID. Refunds are processed by Paddle and typically appear within
        5–10 business days depending on your payment method.
      </p>

      <h2>Renewals and mid-cycle cancellations</h2>
      <p>
        Subscriptions renew automatically each billing period. If you cancel after the{" "}
        {LEGAL.refundWindowDays}-day guarantee window, your access continues until the end of the current
        billing period and no partial refund is issued for unused time, unless required by applicable
        consumer law in your jurisdiction.
      </p>
      <p>
        You can cancel anytime from Settings → Billing → Manage billing (Paddle customer portal).
      </p>

      <h2>WhatsApp message packs</h2>
      <p>
        One-time WhatsApp message pack purchases are refundable within {LEGAL.refundWindowDays} days if
        credits have not been used. Once credits are added to your account and consumed, those purchases
        are non-refundable except where consumer law requires otherwise.
      </p>

      <h2>Free plan</h2>
      <p>
        The Starter (free) plan does not involve charges and is not subject to this refund policy.
      </p>

      <h2>Chargebacks</h2>
      <p>
        Please contact us before initiating a chargeback so we can resolve the issue. Unauthorized
        chargebacks may result in account suspension.
      </p>

      <h2>Contact</h2>
      <p>
        Refund requests: <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
        <br />
        Paddle support: available via your receipt email or the Paddle checkout portal.
      </p>
    </LegalLayout>
  );
}
