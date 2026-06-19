import Link from "next/link";
import { LegalLayout } from "@/components/legal-layout";

export default function QuickBooksIntegrationPage() {
  return (
    <LegalLayout title="QuickBooks Online integration" updated="June 18, 2026">
      <p>
        GentleTap connects to <strong>QuickBooks Online</strong> to import your unpaid invoices and
        client contact details, detect when payments are received, and stop reminders automatically.
      </p>

      <h2>What GentleTap accesses</h2>
      <p>
        We request the <strong>QuickBooks Online Accounting</strong> scope (
        <code>com.intuit.quickbooks.accounting</code>). GentleTap uses this access to:
      </p>
      <ul>
        <li>Read invoices, balances, due dates, and payment status</li>
        <li>Read customer names, email addresses, and phone numbers for reminders</li>
        <li>Detect when an invoice is paid so follow-ups stop</li>
      </ul>
      <p>
        GentleTap does <strong>not</strong> create, modify, or delete records in your QuickBooks
        company. We do not write invoices, payments, or journal entries back to QuickBooks.
      </p>

      <h2>How to connect</h2>
      <ol>
        <li>
          Sign in to GentleTap at{" "}
          <Link href="/login">gentletap.co/login</Link>
        </li>
        <li>
          Go to <strong>Settings → Connections</strong>
        </li>
        <li>
          Select <strong>Connect to QuickBooks</strong> and authorize access in the Intuit consent
          screen
        </li>
        <li>Invoices sync automatically every 30 minutes while connected</li>
      </ol>

      <h2>How to disconnect</h2>
      <p>You can disconnect at any time:</p>
      <ul>
        <li>
          In GentleTap: <strong>Settings → Connections → Disconnect from QuickBooks</strong>
        </li>
        <li>
          In QuickBooks Online: <strong>Apps → My apps</strong>, find GentleTap, and disconnect
        </li>
      </ul>
      <p>
        When you disconnect, GentleTap revokes OAuth tokens and stops syncing. See our{" "}
        <Link href="/integrations/quickbooks/disconnected">disconnect page</Link> for details.
      </p>

      <h2>Data &amp; privacy</h2>
      <p>
        QuickBooks data is used only for your account. We do not sell QuickBooks data or share one
        customer&apos;s QuickBooks data with other GentleTap users. See our{" "}
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
