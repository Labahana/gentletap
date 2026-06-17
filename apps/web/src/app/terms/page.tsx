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

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold">Terms of Service</h1>
        <p className="mt-2 text-muted">Last updated: June 16, 2026</p>

        <h2 className="mt-10 text-xl font-semibold">Service</h2>
        <p className="mt-3 leading-relaxed text-muted">
          GentleTap helps freelancers send AI-assisted payment reminders. You remain responsible for
          the content sent to your clients and for complying with applicable laws.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Accounts & billing</h2>
        <p className="mt-3 leading-relaxed text-muted">
          <strong>Starter</strong> (free) includes up to 5 invoice collections per calendar month.{" "}
          <strong>Pro</strong> ($19/mo or $190/yr), <strong>Pro+</strong> ($39/mo or $390/yr), and{" "}
          <strong>Team</strong> ($59/mo or $590/yr) add unlimited sequences and additional features.
          Subscriptions are billed monthly or annually via Paddle and may be cancelled through the
          billing portal.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Acceptable use</h2>
        <p className="mt-3 leading-relaxed text-muted">
          Do not use GentleTap for harassment, spam, or unlawful collection practices. We may suspend
          accounts that violate these terms.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Limitation of liability</h2>
        <p className="mt-3 leading-relaxed text-muted">
          GentleTap is provided &quot;as is.&quot; We are not liable for unpaid invoices, damaged
          client relationships, or indirect damages arising from use of the service.
        </p>

        <h2 className="mt-10 text-xl font-semibold">Contact</h2>
        <p className="mt-3 leading-relaxed text-muted">
          Questions? Email <a href="mailto:legal@gentletap.co">legal@gentletap.co</a>.
        </p>
      </main>
    </div>
  );
}
