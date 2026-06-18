import { LegalLayout } from "@/components/legal-layout";

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="June 18, 2026">
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of GentleTap at{" "}
        <a href="https://gentletap.co" target="_blank" rel="noopener noreferrer">
          gentletap.co
        </a>
        . By creating an account or using the service, you agree to these Terms.
      </p>

      <h2>Service description</h2>
      <p>
        GentleTap helps freelancers and small businesses send AI-assisted payment reminders. The
        service connects to QuickBooks, drafts follow-up messages, and sends them via your connected
        email or WhatsApp channel. You remain the sender of record to your clients.
      </p>

      <h2>Accounts</h2>
      <p>
        You must provide accurate registration information and keep your credentials secure. You are
        responsible for all activity under your account. Notify us immediately at{" "}
        <a href="mailto:support@gentletap.co">support@gentletap.co</a> if you suspect unauthorized
        access.
      </p>

      <h2>Billing and Paddle (Merchant of Record)</h2>
      <p>
        Paid plans are processed by <strong>Paddle.com Market Ltd</strong> (&quot;Paddle&quot;), which
        acts as Merchant of Record for all transactions. This means Paddle is the seller of record for
        your subscription; your receipt and tax invoices are issued by Paddle. Paddle handles payment
        processing, sales tax, and invoicing on our behalf.
      </p>
      <p>
        <strong>Starter</strong> (free) includes up to 5 invoice collections per calendar month.{" "}
        <strong>Pro</strong> ($19/mo or $190/yr), <strong>Pro+</strong> ($39/mo or $390/yr), and{" "}
        <strong>Team</strong> ($59/mo or $590/yr) add unlimited sequences and additional features.
        Subscriptions renew automatically until cancelled through the Paddle billing portal accessible
        from your GentleTap billing settings.
      </p>
      <p>
        Refunds are governed by our{" "}
        <a href="/refund">Refund Policy</a>.
      </p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>
          You warrant that you have a legitimate business relationship with each client you contact
          through GentleTap and that you have obtained any consent required under applicable law
          (including CAN-SPAM, GDPR, and local messaging regulations) before sending email or WhatsApp
          reminders.
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
        AI output may contain errors. You should review drafts before approval. GentleTap does not
        guarantee that AI-generated text is accurate, legally compliant, or appropriate for every
        situation — you are responsible for what you send to your clients.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to use GentleTap to:</p>
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
        GentleTap relies on third-party APIs (QuickBooks, Google, Resend, Paddle, Twilio/Meta). We do
        not control their uptime or policy changes. We may modify or discontinue features if a
        third-party integration becomes unavailable.
      </p>

      <h2>Intellectual property</h2>
      <p>
        GentleTap owns the service, software, and branding. You retain ownership of your client data
        and the content of messages you approve and send.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        GentleTap is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any
        kind, express or implied, including merchantability, fitness for a particular purpose, or
        non-infringement. We do not guarantee that reminders will result in payment or preserve client
        relationships.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, GentleTap and its operators shall not be liable for
        indirect, incidental, special, consequential, or punitive damages, or for lost profits,
        unpaid invoices, or damaged client relationships arising from use of the service. Our total
        liability for any claim shall not exceed the amount you paid us in the twelve months preceding
        the claim.
      </p>

      <h2>Termination</h2>
      <p>
        You may cancel your subscription via the Paddle billing portal and delete your account from
        Profile settings. We may terminate or suspend access for violation of these Terms. Upon
        termination, your right to use the service ends; provisions that by nature should survive
        (including liability limits) will survive.
      </p>

      <h2>Governing law</h2>
      <p>
        These Terms are governed by the laws of the State of Delaware, United States, without regard
        to conflict-of-law principles, except where mandatory consumer protection laws in your country
        of residence apply.
      </p>

      <h2>Contact</h2>
      <p>
        Legal questions: <a href="mailto:legal@gentletap.co">legal@gentletap.co</a>
        <br />
        See our <a href="/contact">Contact page</a> for additional contact options.
      </p>
    </LegalLayout>
  );
}
