import Link from "next/link";
import { Logo } from "@/components/logo";

export default function QuickBooksDisconnectedPage() {
  return (
    <div className="min-h-full flex flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Logo height={28} />
          <Link href="/" className="text-sm text-muted hover:text-foreground">
            Home
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-bold">QuickBooks disconnected</h1>
        <p className="mt-4 leading-relaxed text-muted">
          The connection between GentleTap and your QuickBooks Online company has been terminated.
          GentleTap can no longer sync invoices or detect payments from that company.
        </p>

        <h2 className="mt-8 text-lg font-semibold">What this means</h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-muted">
          <li>OAuth access tokens have been revoked</li>
          <li>Automatic invoice sync has stopped</li>
          <li>Active reminder sequences may pause until you reconnect email and QuickBooks</li>
          <li>Your GentleTap account and past reminder history remain unless you delete your account</li>
        </ul>

        <h2 className="mt-8 text-lg font-semibold">Reconnect QuickBooks</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-muted">
          <li>
            <Link href="/login" className="text-accent hover:underline">
              Sign in to GentleTap
            </Link>
          </li>
          <li>
            Open <strong>Settings → Connections</strong>
          </li>
          <li>Select <strong>Connect to QuickBooks</strong> and authorize access again</li>
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/login" className="btn-primary">
            Sign in to reconnect
          </Link>
          <Link href="/integrations/quickbooks" className="btn-secondary">
            Integration details
          </Link>
        </div>

        <p className="mt-8 text-sm text-muted">
          Need help? <a href="mailto:support@gentletap.co">support@gentletap.co</a>
        </p>
      </main>
    </div>
  );
}
