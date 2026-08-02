import Link from "next/link";
import { LegalLayout } from "@/components/legal-layout";

export default function FreshBooksIntegrationPage() {
  return (
    <LegalLayout title="FreshBooks integration" updated="August 1, 2026">
      <p>
        GentleTap connects to <strong>FreshBooks</strong> to import your outstanding invoices and
        client contact details, detect when payments are received, and stop reminders automatically.
      </p>

      <h2>What GentleTap accesses</h2>
      <p>
        We request least-privilege OAuth scopes via the official FreshBooks Python SDK (
        <code>freshbooks-sdk</code>):
      </p>
      <ul>
        <li>
          <code>user:profile:read</code> — identify your business account
        </li>
        <li>
          <code>user:clients:read</code> — client names, emails, and phones for reminders
        </li>
        <li>
          <code>user:invoices:read</code> — outstanding invoices, balances, and due dates
        </li>
        <li>
          <code>user:payments:read</code> — detect payments so follow-ups stop
        </li>
      </ul>
      <p>
        GentleTap does <strong>not</strong> create, modify, or delete records in your FreshBooks
        account. We do not process client payments or replace FreshBooks payment gateways.
      </p>

      <h2>How to connect</h2>
      <ol>
        <li>
          Sign in to GentleTap at <Link href="/login">gentletap.co/login</Link>
        </li>
        <li>
          Go to <strong>Settings → Integrations</strong> (or start from onboarding)
        </li>
        <li>
          Select <strong>Connect FreshBooks</strong> and authorize access on the FreshBooks consent
          screen
        </li>
        <li>Invoices sync automatically every 30 minutes while connected (plus real-time webhooks)</li>
      </ol>

      <h2>How to disconnect</h2>
      <p>You can disconnect at any time:</p>
      <ul>
        <li>
          In GentleTap: <strong>Settings → Integrations → Disconnect</strong> on FreshBooks
        </li>
        <li>In FreshBooks: manage connected apps from your account integrations page</li>
      </ul>
      <p>When you disconnect, GentleTap stops syncing and soft-disconnects the integration.</p>

      <h2>Data &amp; privacy</h2>
      <p>
        FreshBooks data is used only for your account. We do not sell FreshBooks data or share one
        customer&apos;s FreshBooks data with other GentleTap users. See our{" "}
        <Link href="/privacy">Privacy Policy</Link> for retention and deletion details.
      </p>

      <h2>Support</h2>
      <p>
        Questions about the integration? Email{" "}
        <a href="mailto:support@gentletap.co">support@gentletap.co</a> or visit our{" "}
        <Link href="/contact">Contact page</Link>.
      </p>
    </LegalLayout>
  );
}
