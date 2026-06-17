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

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="mt-2 text-muted">Last updated: June 16, 2026</p>

        <h2 className="mt-10 text-xl font-semibold">What we collect</h2>
        <p className="mt-3 leading-relaxed text-muted">
          When you use GentleTap, we store your account information, QuickBooks invoice and client
          data needed to send payment reminders, email connection tokens (encrypted), and reminder
          activity logs.
        </p>

        <h2 className="mt-10 text-xl font-semibold">How we use data</h2>
        <p className="mt-3 leading-relaxed text-muted">
          We use your data solely to sync invoices, generate and send reminders on your behalf, detect
          payments, and improve reminder timing and tone. We do not sell your data.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Third parties</h2>
        <p className="mt-3 leading-relaxed text-muted">
          GentleTap integrates with Intuit QuickBooks, Google Gmail, Resend, Paddle, OpenAI, and
          optionally Twilio. Each provider receives only the data required for the integration you
          enable.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Contact</h2>
        <p className="mt-3 leading-relaxed text-muted">
          Questions about privacy? Email{" "}
          <a href="mailto:privacy@gentletap.co">privacy@gentletap.co</a>.
        </p>
      </main>
    </div>
  );
}
