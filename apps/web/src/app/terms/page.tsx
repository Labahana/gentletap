import { LegalEntityBlock } from "@/components/legal-entity-block";
import { LegalLayout } from "@/components/legal-layout";
import { LEGAL, operatorIntro } from "@/lib/legal";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 18, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of {LEGAL.productName} at{" "}
        <a href={LEGAL.websiteUrl} target="_blank" rel="noopener noreferrer">
          {LEGAL.websiteDisplay}
        </a>
        . By creating an account or using the service, you agree to these Terms.
      </p>

      <h2>Who we are</h2>
      <p>{operatorIntro()}</p>
      <LegalEntityBlock />

      <h2>Service description</h2>
      <p>
        {LEGAL.productName} is cloud-based software that helps freelancers and small businesses send
        AI-assisted payment reminders. The service connects to QuickBooks Online, drafts follow-up
        messages, and sends them via your connected email or WhatsApp channel. You remain the sender
        of record to your clients. All features are delivered digitally through your web dashboard —
        there is no physical goods delivery and no human-managed collection service.
      </p>

      <h2>QuickBooks Online integration</h2>
      <p>
        If you connect QuickBooks Online, you authorize {LEGAL.productName} to access accounting data
        via Intuit&apos;s OAuth 2.0 API. {LEGAL.productName} reads invoices and customer contact
        information to sync unpaid balances and detect payments. We do not write data back to your
        QuickBooks company.
      </p>
      <p>
        You may disconnect QuickBooks at any time from Settings → Connections or from the QuickBooks
        Apps menu. Disconnecting revokes OAuth access and stops sync. See our{" "}
        <a href="/integrations/quickbooks">integration overview</a> and{" "}
        <a href="/integrations/quickbooks/disconnected">disconnect information</a>.
      </p>
      <p>
        Your use of QuickBooks through {LEGAL.productName} is also subject to{" "}
        <a
          href="https://developer.intuit.com/app/developer/qbo/docs/legal-agreements/intuit-terms-of-service-for-intuit-developer-services"
          target="_blank"
          rel="noopener noreferrer"
        >
          Intuit Developer Terms
        </a>{" "}
        and Intuit&apos;s applicable end-user terms for QuickBooks Online.
      </p>

      <h2>Accounts</h2>
      <p>
        You must provide accurate registration information and keep your credentials secure. You are
        responsible for all activity under your account. Notify us immediately at{" "}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> if you suspect unauthorized
        access.
      </p>

      <h2>Plans and pricing</h2>
      <p>Current plans (prices in USD):</p>
      <ul>
        <li>
          <strong>Starter</strong> — free; up to 5 invoice collections per calendar month; email
          reminders and QuickBooks sync
        </li>
        <li>
          <strong>Pro</strong> — $19/month or $190/year; unlimited sequences, autonomous email
          follow-ups, Gmail sending
        </li>
        <li>
          <strong>Pro+</strong> — $39/month or $390/year; everything in Pro plus WhatsApp follow-ups
          (450 messages/month)
        </li>
        <li>
          <strong>Team</strong> — $59/month or $590/year; everything in Pro+ plus team seats and
          priority support
        </li>
      </ul>
      <p>
        One-time WhatsApp message packs may be offered separately. See the{" "}
        <a href="/#pricing">pricing page</a> for the latest plan details.
      </p>

      <h2>Billing and Paddle (Merchant of Record)</h2>
      <p>
        Paid plans and one-time purchases are processed by <strong>{LEGAL.paddleMoR}</strong>{" "}
        (&quot;Paddle&quot;), which acts as Merchant of Record for all transactions. Paddle is the
        seller of record; your receipt and tax invoices are issued by Paddle. Paddle handles payment
        processing, sales tax, and invoicing on our behalf.
      </p>

      <h3>Subscriptions</h3>
      <ul>
        <li>
          Paid subscriptions <strong>renew automatically</strong> at the end of each billing period
          (monthly or annual) until you cancel.
        </li>
        <li>
          You may <strong>cancel anytime</strong> from Settings → Billing → Manage billing (Paddle
          customer portal). Cancellation stops future charges; access continues until the end of the
          current paid period.
        </li>
        <li>
          Upgrades take effect immediately; downgrades or cancellations apply at the next renewal
          unless otherwise stated at checkout.
        </li>
        <li>
          We may change plan prices with reasonable notice. Existing subscribers are notified before
          price changes apply to their next renewal.
        </li>
      </ul>
      <p>
        Refunds are governed by our <a href="/refund">Refund Policy</a>.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>
          You warrant that you have a legitimate business relationship with each client you contact
          through {LEGAL.productName} and that you have obtained any consent required under applicable
          law (including CAN-SPAM, GDPR, and local messaging regulations) before sending email or
          WhatsApp reminders.
        </li>
        <li>
          You are solely responsible for reviewing and approving reminder content before it is sent
          (during onboarding and for any messages you choose to edit).
        </li>
        <li>
          You must comply with Intuit, Google, Meta/WhatsApp, and Resend platform policies when using
          connected integrations.
        </li>
      </ul>

      <h2>AI-generated content</h2>
      <p>
        Reminder drafts are produced by AI (Kimi / Moonshot AI) based on your invoice and client data.
        AI output may contain errors. You should review drafts before approval. {LEGAL.productName} does
        not guarantee that AI-generated text is accurate, legally compliant, or appropriate for every
        situation — you are responsible for what you send to your clients.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to use {LEGAL.productName} to:</p>
      <ul>
        <li>Harass, threaten, or send unlawful collection communications</li>
        <li>Send spam or messages to recipients without a legitimate business relationship</li>
        <li>Impersonate another person or misrepresent your identity</li>
        <li>Attempt to bypass usage limits, security controls, or third-party API restrictions</li>
        <li>Upload or transmit malware or abusive content</li>
      </ul>
      <p>
        We may suspend or terminate accounts that violate these Terms or pose risk to clients,
        integrations, or the platform.
      </p>

      <h2>Integrations and availability</h2>
      <p>
        {LEGAL.productName} relies on third-party APIs (QuickBooks, Google, Resend, Paddle, Twilio/Meta).
        We do not control their uptime or policy changes. We may modify or discontinue features if a
        third-party integration becomes unavailable.
      </p>

      <h2>Intellectual property</h2>
      <p>
        {LEGAL.productName} owns the service, software, and branding. You retain ownership of your
        client data and the content of messages you approve and send.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        {LEGAL.productName} is provided &quot;as is&quot; and &quot;as available&quot; without warranties
        of any kind, express or implied, including merchantability, fitness for a particular purpose,
        or non-infringement. We do not guarantee that reminders will result in payment or preserve
        client relationships.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {LEGAL.legalName} and its operators shall not be liable
        for indirect, incidental, special, consequential, or punitive damages, or for lost profits,
        unpaid invoices, or damaged client relationships arising from use of the service. Our total
        liability for any claim shall not exceed the amount you paid us in the twelve months preceding
        the claim.
      </p>

      <h2>Termination and data</h2>
      <p>
        You may cancel your subscription via the Paddle billing portal and delete your account from
        Profile settings. We may terminate or suspend access for violation of these Terms.
      </p>
      <p>When you cancel or delete your account:</p>
      <ul>
        <li>Autopilot and reminder sending stop immediately</li>
        <li>Connected integrations (QuickBooks, Gmail, WhatsApp) are revoked</li>
        <li>
          You may export your data from Profile settings before deletion; deleted account data is
          removed from our active systems within 30 days except where retention is required by law
        </li>
        <li>
          Billing records are retained by Paddle as Merchant of Record as required for tax and
          accounting purposes
        </li>
      </ul>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of the {LEGAL.governingLaw}, without regard to
        conflict-of-law principles, except where mandatory consumer protection laws in your country of
        residence apply.
      </p>

      <h2>Contact</h2>
      <p>
        Legal questions: <a href={`mailto:${LEGAL.legalEmail}`}>{LEGAL.legalEmail}</a>
        <br />
        See our <a href="/contact">Contact page</a> for additional contact options.
      </p>
    </LegalLayout>
  );
}
