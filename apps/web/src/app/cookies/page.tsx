import { LegalLayout } from "@/components/legal-layout";

export default function CookiesPage() {
  return (
    <LegalLayout title="Cookie Policy" updated="June 18, 2026">
      <p>
        This Cookie Policy explains how GentleTap uses cookies and similar technologies when you visit{" "}
        <a href="https://gentletap.co" target="_blank" rel="noopener noreferrer">
          gentletap.co
        </a>
        .
      </p>

      <h2>What we use</h2>
      <h3>Essential storage</h3>
      <p>
        GentleTap uses browser local storage to keep you signed in (access and refresh tokens) and to
        remember your cookie consent choice. These are strictly necessary to operate the authenticated
        dashboard and cannot be disabled while using the service.
      </p>
      <h3>Session cookies</h3>
      <p>
        Our authentication flow may set short-lived cookies during Google sign-in or OAuth redirects.
        These are used only to complete the login process.
      </p>
      <h3>Analytics</h3>
      <p>
        We do not currently use third-party analytics or advertising cookies. If we add analytics in
        the future, we will update this policy and request consent where required.
      </p>

      <h2>Third-party cookies</h2>
      <p>
        When you connect integrations or complete checkout, third parties may set their own cookies:
      </p>
      <ul>
        <li>
          <strong>Google</strong> — during Gmail or Google sign-in OAuth
        </li>
        <li>
          <strong>Paddle</strong> — during subscription checkout
        </li>
      </ul>
      <p>Refer to each provider&apos;s cookie policy for details.</p>

      <h2>Managing cookies</h2>
      <p>
        You can clear local storage and cookies in your browser settings. Doing so will sign you out
        of GentleTap. You can also revoke Google access at{" "}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google Account permissions
        </a>
        .
      </p>
      <p>
        When you first visit our marketing site, we show a consent banner. Your choice is stored in
        local storage under <code>gentletap_cookie_consent</code>.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:privacy@gentletap.co">privacy@gentletap.co</a>
      </p>
    </LegalLayout>
  );
}
