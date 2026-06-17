import Link from "next/link";

export default function TermsPage() {
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
        <h1>Terms of Service</h1>
        <p className="text-muted">Last updated: June 16, 2026</p>

        <h2>Service</h2>
        <p>
          GentleTap helps freelancers send AI-assisted payment reminders. You remain responsible for
          the content sent to your clients and for complying with applicable laws.
        </p>

        <h2>Accounts & billing</h2>
        <p>
          <strong>Starter</strong> (free) includes up to 5 active invoice sequences.{" "}
          <strong>Pro</strong> ($19/mo or $190/yr), <strong>Pro+</strong> ($39/mo or $390/yr), and{" "}
          <strong>Team</strong> ($59/mo or $590/yr) add unlimited sequences and additional features.
          Subscriptions are billed monthly or annually via Stripe and may be cancelled through the
          billing portal.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Do not use GentleTap for harassment, spam, or unlawful collection practices. We may suspend
          accounts that violate these terms.
        </p>

        <h2>Limitation of liability</h2>
        <p>
          GentleTap is provided &quot;as is.&quot; We are not liable for unpaid invoices, damaged
          client relationships, or indirect damages arising from use of the service.
        </p>

        <h2>Contact</h2>
        <p>
          Questions? Email <a href="mailto:legal@gentletap.co">legal@gentletap.co</a>.
        </p>
      </main>
    </div>
  );
}
