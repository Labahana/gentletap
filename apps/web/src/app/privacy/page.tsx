import { LegalEntityBlock } from "@/components/legal-entity-block";
import { LegalLayout } from "@/components/legal-layout";
import { LEGAL, operatorIntro } from "@/lib/legal";

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="June 18, 2026">
      <p>
        {operatorIntro()} This Privacy Policy explains what we collect, why we collect it, who we share
        it with, and the choices you have.
      </p>

      <LegalEntityBlock />

      <h2>Information we collect</h2>
      <h3>Account information</h3>
      <p>
        When you register, we collect your email address, name, password (stored as a secure hash), and
        optional profile preferences such as your work persona and timezone.
      </p>
      <h3>QuickBooks data</h3>
      <p>
        If you connect QuickBooks Online, we import invoice and customer data needed to send payment
        reminders: client names, email addresses, phone numbers, invoice amounts, balances, due dates,
        and payment status. We sync this data periodically while your connection is active.
      </p>
      <p>
        We use the Intuit QuickBooks Online Accounting API scope (
        <code>com.intuit.quickbooks.accounting</code>) for <strong>read-only</strong> access. GentleTap
        reads invoices and customer records to power reminders and payment detection. We do not create,
        modify, or delete accounting records in your QuickBooks company.
      </p>
      <p>
        QuickBooks data is used only for your account. We do not aggregate QuickBooks data across
        customers or share one user&apos;s QuickBooks data with another user. If you disconnect
        QuickBooks or delete your account, OAuth tokens are revoked and sync stops.
      </p>
      <p>
        Learn more on our{" "}
        <a href="/integrations/quickbooks">QuickBooks integration page</a>. Intuit&apos;s handling of
        your Intuit account is governed by{" "}
        <a
          href="https://www.intuit.com/legal/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Intuit&apos;s policies
        </a>
        .
      </p>
      <h3>Email and messaging</h3>
      <p>
        If you connect Gmail, we store OAuth tokens (encrypted) and your connected Gmail address so we
        can send reminders on your behalf via the Gmail API (<code>gmail.send</code> scope only). If you
        verify a domain via Resend, we store your sender address and verification status. If you enable
        WhatsApp, we store your connected phone number, message delivery metadata, and inbound replies
        from clients.
      </p>
      <h3>AI-generated content</h3>
      <p>
        Reminder drafts are generated using Kimi (Moonshot AI). We send invoice context (amounts, due
        dates, client names, payment history) to Moonshot solely to produce reminder text. We do not use
        your data to train third-party models.
      </p>
      <h3>Usage and logs</h3>
      <p>
        We retain reminder send logs, sync logs, billing events, and security-related logs (such as
        authentication activity) to operate and secure the service.
      </p>

      <h2>How we use your information</h2>
      <ul>
        <li>Sync invoices and detect payments from QuickBooks</li>
        <li>Generate and send payment reminders via email and/or WhatsApp on your behalf</li>
        <li>Personalize reminder timing and tone based on client payment patterns</li>
        <li>Process subscriptions and one-time purchases through Paddle</li>
        <li>Provide customer support and comply with legal obligations</li>
      </ul>
      <p>We do not sell your personal data or client lists.</p>

      <h2>Sub-processors and third parties</h2>
      <p>
        We use the following service providers. Each receives only the data necessary for the
        integration you enable:
      </p>
      <ul>
        <li>
          <strong>Intuit QuickBooks</strong> — accounting data sync (invoice and customer records)
        </li>
        <li>
          <strong>Google</strong> — sign-in (OAuth) and Gmail send, when you connect Google
        </li>
        <li>
          <strong>Resend</strong> — transactional email and domain sender verification
        </li>
        <li>
          <strong>Paddle</strong> — subscription billing and payment processing (Merchant of Record)
        </li>
        <li>
          <strong>Twilio / Meta WhatsApp</strong> — WhatsApp message delivery, when enabled on eligible
          plans
        </li>
        <li>
          <strong>Moonshot AI (Kimi)</strong> — AI draft generation for reminder messages
        </li>
        <li>
          <strong>Self-hosted infrastructure</strong> — PostgreSQL database and Redis on our VPS for
          application data and job queues
        </li>
      </ul>
      <p>
        Each provider&apos;s own privacy policy governs their handling of data they process on our
        behalf.
      </p>

      <h2>Data retention</h2>
      <ul>
        <li>
          <strong>Account data</strong> — retained while your account is active; deleted within 30 days
          of account deletion (see below).
        </li>
        <li>
          <strong>QuickBooks / Gmail tokens</strong> — deleted when you disconnect the integration or
          delete your account.
        </li>
        <li>
          <strong>Reminder logs</strong> — retained for up to 24 months for dispute resolution and
          service improvement, then deleted or anonymized.
        </li>
        <li>
          <strong>Billing records</strong> — retained as required by tax and accounting law (typically
          7 years), handled by Paddle as Merchant of Record.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Depending on your location, you may have the right to access, export, correct, or delete your
        personal data, and to object to or restrict certain processing.
      </p>
      <ul>
        <li>
          <strong>Export</strong> — download a copy of your data from Profile &amp; settings in the
          dashboard.
        </li>
        <li>
          <strong>Delete</strong> — permanently delete your account and associated data from Profile
          &amp; settings. Cancel any active Paddle subscription first via the billing portal.
        </li>
        <li>
          <strong>Disconnect integrations</strong> — revoke QuickBooks, Gmail, or WhatsApp access at any
          time from Connections settings.
        </li>
        <li>
          <strong>Google account permissions</strong> — you can also revoke GentleTap&apos;s access at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Account permissions
          </a>
          .
        </li>
      </ul>
      <p>
        To exercise rights not available in the app, email{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>. We respond within 30 days.
      </p>

      <h2>Security</h2>
      <p>
        OAuth tokens are encrypted at rest. API access requires authentication. We use HTTPS in
        production and follow industry-standard practices to protect your data.
      </p>

      <h2>Children</h2>
      <p>
        GentleTap is a business service for freelancers and is not directed at children under 16. We do
        not knowingly collect data from children.
      </p>

      <h2>Changes</h2>
      <p>
        We may update this policy from time to time. Material changes will be posted on this page with
        an updated date.
      </p>

      <h2>Contact</h2>
      <p>
        Privacy questions:{" "}
        <a href={`mailto:${LEGAL.privacyEmail}`}>{LEGAL.privacyEmail}</a>
        <br />
        General support:{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
        <br />
        See also our <a href="/contact">Contact page</a>.
      </p>
    </LegalLayout>
  );
}
