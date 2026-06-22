import { LegalEntityBlock } from "@/components/legal-entity-block";
import { LegalLayout } from "@/components/legal-layout";
import { LEGAL } from "@/lib/legal";

export default function ContactPage() {
  return (
    <LegalLayout title="Contact" updated="June 18, 2026">
      <p>
        We&apos;re here to help with product questions, billing, privacy requests, and integration
        support.
      </p>

      <h2>Business</h2>
      <LegalEntityBlock />

      <h2>Email</h2>
      <ul>
        <li>
          <strong>General support:</strong>{" "}
          <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
        </li>
        <li>
          <strong>Privacy &amp; data requests:</strong>{" "}
          <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
        </li>
        <li>
          <strong>Legal &amp; terms:</strong>{" "}
          <a href={`mailto:${LEGAL.legalEmail}`}>{LEGAL.legalEmail}</a>
        </li>
      </ul>

      <h2>Response time</h2>
      <p>
        We aim to respond to support emails within 2 business days. Privacy and data-deletion requests
        are handled within 30 days as required by applicable law.
      </p>

      <h2>Billing</h2>
      <p>
        Paid subscriptions are sold by {LEGAL.paddleMoR} (Merchant of Record). For receipts and tax
        invoices, refer to emails from Paddle or open the billing portal from your GentleTap account
        settings.
      </p>

      <h2>Self-service</h2>
      <ul>
        <li>
          <strong>Export your data</strong> — Profile &amp; settings → Download my data
        </li>
        <li>
          <strong>Delete your account</strong> — Profile &amp; settings → Delete account
        </li>
        <li>
          <strong>Disconnect integrations</strong> — Settings → Connections
        </li>
        <li>
          <strong>Manage subscription</strong> — Settings → Billing → Manage billing
        </li>
        <li>
          <strong>QuickBooks integration</strong> —{" "}
          <a href="/integrations/quickbooks">How GentleTap uses QuickBooks Online</a>
        </li>
      </ul>
    </LegalLayout>
  );
}
