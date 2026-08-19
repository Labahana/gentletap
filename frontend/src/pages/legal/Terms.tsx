import React from 'react';
import { LegalLayout } from '@/components/LegalLayout';
import { LegalEntityBlock, LEGAL, operatorIntro } from '@/lib/legal';

export const TermsPage: React.FC = () => (
  <LegalLayout title="Terms of Service" updated="August 1, 2026">
    <p>
      These Terms of Service ("Terms") govern your use of {LEGAL.productName} at{' '}
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
      AI-assisted payment reminders. The service can connect to QuickBooks Online or FreshBooks,
      drafts follow-up messages, and sends them via your connected email or WhatsApp channel. You
      remain the sender of record to your clients. All features are delivered digitally through your
      web dashboard — there is no physical goods delivery and no human-managed collection service.
    </p>

    <h2>Accounting integrations</h2>
    <p>
      If you connect QuickBooks Online, you authorize {LEGAL.productName} to access accounting data
      via Intuit's OAuth 2.0 API. If you connect FreshBooks, you authorize access via FreshBooks'
      OAuth 2.0 API and the official FreshBooks SDK. In both cases {LEGAL.productName} reads invoices
      and customer contact information to sync unpaid balances and detect payments. We do not write
      data back to your accounting company, and we do not process client payments on your behalf.
    </p>
    <p>
      You may disconnect QuickBooks or FreshBooks at any time from Settings. Disconnecting revokes
      OAuth access and stops sync.
    </p>
    <p>
      Your use of QuickBooks through {LEGAL.productName} is also subject to{' '}
      <a
        href="https://developer.intuit.com/app/developer/qbo/docs/legal-agreements/intuit-terms-of-service-for-intuit-developer-services"
        target="_blank"
        rel="noopener noreferrer"
      >
        Intuit Developer Terms
      </a>{' '}
      and Intuit's applicable end-user terms. Your use of FreshBooks through {LEGAL.productName} is
      also subject to FreshBooks' applicable terms and API policies.
    </p>

    <h2>Accounts</h2>
    <p>
      You must provide accurate registration information and keep your credentials secure. You are
      responsible for all activity under your account. Notify us immediately at{' '}
      <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> if you suspect unauthorized
      access.
    </p>

    <h2>Plans and pricing</h2>
    <p>Current plans (prices in USD):</p>
    <ul>
      <li><strong>Starter</strong> — free; limited invoice collections per calendar month; email reminders and QuickBooks / FreshBooks sync</li>
      <li><strong>Pro</strong> — unlimited sequences, autonomous email follow-ups, Gmail sending</li>
      <li><strong>Pro+</strong> — everything in Pro plus WhatsApp follow-ups</li>
      <li><strong>Team</strong> — everything in Pro+ plus team seats and priority support</li>
    </ul>
    <p>
      One-time WhatsApp message packs may be offered separately. See the pricing page for the latest
      plan details.
    </p>

    <h2>Billing and Paddle (Merchant of Record)</h2>
    <p>
      Paid plans and one-time purchases are processed by <strong>{LEGAL.paddleMoR}</strong>{" "}
      ("Paddle"), which acts as Merchant of Record for all transactions. Paddle is the seller of
      record; your receipt and tax invoices are issued by Paddle. Paddle handles payment processing,
      sales tax, and invoicing on our behalf.
    </p>

    <h3>Subscriptions</h3>
    <ul>
      <li>Paid subscriptions <strong>renew automatically</strong> at the end of each billing period until you cancel.</li>
      <li>You may <strong>cancel anytime</strong> from Settings → Billing (Paddle customer portal). Cancellation stops future charges; access continues until the end of the current paid period.</li>
      <li>Upgrades take effect immediately; downgrades or cancellations apply at the next renewal unless otherwise stated at checkout.</li>
      <li>We may change plan prices with reasonable notice. Existing subscribers are notified before price changes apply to their next renewal.</li>
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
      <li>You are solely responsible for reviewing and approving reminder content before it is sent.</li>
      <li>You must comply with Intuit, Google, Meta/WhatsApp, and Resend platform policies when using connected integrations.</li>
    </ul>

    <h2>AI-generated content</h2>
    <p>
      Reminder drafts are produced by AI based on your invoice and client data. AI output may contain
      errors. You should review drafts before approval. {LEGAL.productName} does not guarantee that
      AI-generated text is accurate, legally compliant, or appropriate for every situation — you are
      responsible for what you send to your clients.
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
      {LEGAL.productName} relies on third-party APIs (QuickBooks, FreshBooks, Google, Resend, Paddle,
      Twilio/Meta). We do not control their uptime or policy changes. We may modify or discontinue
      features if a third-party integration becomes unavailable.
    </p>

    <h2>Intellectual property</h2>
    <p>
      {LEGAL.productName} owns the service, software, and branding. You retain ownership of your
      client data and the content of messages you approve and send.
    </p>

    <h2>Disclaimer of warranties</h2>
    <p>
      {LEGAL.productName} is provided "as is" and "as available" without warranties of any kind,
      express or implied. We do not guarantee that reminders will result in payment or preserve
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
      Settings. We may terminate or suspend access for violation of these Terms.
    </p>
    <p>When you cancel or delete your account:</p>
    <ul>
      <li>Autopilot and reminder sending stop immediately</li>
      <li>Connected integrations (QuickBooks, FreshBooks, Gmail, WhatsApp) are revoked</li>
      <li>You may export your data before deletion; deleted account data is removed from our active systems within 30 days except where retention is required by law</li>
      <li>Billing records are retained by Paddle as Merchant of Record as required for tax purposes</li>
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
    </p>
  </LegalLayout>
);
