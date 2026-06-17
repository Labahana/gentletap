import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Gentle<span className="text-accent">Tap</span>
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12 prose prose-neutral">
        <h1>Privacy Policy</h1>
        <p className="text-muted">Last updated: June 16, 2026</p>

        <h2>What we collect</h2>
        <p>
          When you use GentleTap, we store your account information, QuickBooks invoice and client
          data needed to send payment reminders, email connection tokens (encrypted), and reminder
          activity logs.
        </p>

        <h2>How we use data</h2>
        <p>
          We use your data solely to sync invoices, generate and send reminders on your behalf, detect
          payments, and improve reminder timing and tone. We do not sell your data.
        </p>

        <h2>Third parties</h2>
        <p>
          GentleTap integrates with Intuit QuickBooks, Google Gmail, Resend, Stripe, OpenAI, and
          optionally Twilio. Each provider receives only the data required for the integration you
          enable.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy? Email{" "}
          <a href="mailto:privacy@gentletap.co">privacy@gentletap.co</a>.
        </p>
      </main>
    </div>
  );
}
