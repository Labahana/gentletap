import { LegalLayout } from "@/components/legal-layout";

export default function RefundPage() {
  return (
    <LegalLayout title="Refund Policy" updated="June 18, 2026">
      <p>
        This Refund Policy applies to paid subscriptions and one-time purchases for GentleTap,
        processed by Paddle.com Market Ltd (&quot;Paddle&quot;) as Merchant of Record.
      </p>

      <h2>30-day money-back guarantee</h2>
      <p>
        If you are not satisfied with a paid GentleTap subscription, you may request a full refund
        within <strong>30 days</strong> of your initial purchase or upgrade. This guarantee applies
        once per customer per plan tier.
      </p>
      <p>
        To request a refund, email{" "}
        <a href="mailto:support@gentletap.co">support@gentletap.co</a> from your account email with
        your Paddle receipt or transaction ID. Refunds are processed by Paddle and typically appear
        within 5–10 business days depending on your payment method.
      </p>

      <h2>Renewals and mid-cycle cancellations</h2>
      <p>
        Subscriptions renew automatically. If you cancel after the 30-day guarantee period, your
        access continues until the end of the current billing period and no partial refund is issued
        for unused time, unless required by applicable law.
      </p>
      <p>
        You can cancel anytime from Billing settings → Manage billing (Paddle customer portal).
      </p>

      <h2>WhatsApp message packs</h2>
      <p>
        One-time WhatsApp message packs are non-refundable once credits have been added to your
        account, except where Paddle or consumer law requires otherwise.
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
        Refund requests: <a href="mailto:support@gentletap.co">support@gentletap.co</a>
        <br />
        Paddle support: available via your receipt email or the Paddle checkout portal.
      </p>
    </LegalLayout>
  );
}
