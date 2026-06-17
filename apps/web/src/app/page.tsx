import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PreviewDemo } from "@/components/preview-demo";
import { PricingGrid } from "@/components/pricing-grid";
import { PRICING_PLANS } from "@/lib/pricing";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-28">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
            A tap on the shoulder. Not a knock on the door.
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Get paid.{" "}
            <span className="text-accent">Keep the relationship.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted">
            GentleTap connects to QuickBooks, learns how each client pays, and sends
            personalized follow-ups from your email — so you never write an awkward
            payment reminder again.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup" className="btn-primary min-w-[200px]">
              Try free — no credit card
            </Link>
            <Link href="#preview" className="btn-secondary min-w-[200px]">
              See a sample reminder
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">
            Under 5 minutes with Gmail + QuickBooks
          </p>
        </section>

        <section className="border-y border-border bg-card py-16">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-3">
            {[
              {
                title: "Connect QuickBooks",
                body: "We import unpaid invoices and build client profiles automatically.",
              },
              {
                title: "Preview & approve",
                body: "Read AI drafts for your real clients. Approve once, then we run quietly.",
              },
              {
                title: "Get paid faster",
                body: "Reminders stop the moment payment hits QuickBooks.",
              },
            ].map((item) => (
              <div key={item.title} className="text-center md:text-left">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="preview" className="mx-auto max-w-2xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold">This is what Sarah would receive</h2>
          <p className="mt-2 text-center text-sm text-muted">
            Live from the Python intelligence engine
          </p>
          <div className="mt-8">
            <PreviewDemo />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Simple, transparent pricing</h2>
            <p className="mt-2 text-muted">Start free. Upgrade when GentleTap pays for itself.</p>
          </div>
          <div className="mt-10">
            <PricingGrid
              plans={PRICING_PLANS.map((p) => ({
                ...p,
                checkout_monthly_available: false,
                checkout_annual_available: false,
              }))}
            />
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        <p>
          © {new Date().getFullYear()} GentleTap ·{" "}
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
        </p>
      </footer>
    </>
  );
}
