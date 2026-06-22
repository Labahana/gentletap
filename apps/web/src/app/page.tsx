import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PreviewDemo } from "@/components/preview-demo";
import { PricingGrid } from "@/components/pricing-grid";
import { PRICING_PLANS } from "@/lib/pricing";

const STEPS = [
  {
    title: "Connect QuickBooks",
    body: "We find every invoice you've been meaning to chase — balances, due dates, and client history, imported automatically.",
  },
  {
    title: "Preview the message",
    body: "Read AI drafts for your real clients. Approve once — they read like you wrote them yourself.",
  },
  {
    title: "Get paid",
    body: "Reminders go out on your behalf. They stop the second payment lands in QuickBooks.",
  },
] as const;

const FAQ = [
  {
    q: "Will my clients know this is automated?",
    a: "Messages send from your Gmail or verified domain email, in your name. GentleTap drafts the follow-up; you approve before anything goes live. To your client, it reads like you.",
  },
  {
    q: "What if I want to edit a message before it sends?",
    a: "You preview every draft during onboarding and can edit subject and body before approving. After go-live, you can pause any invoice or adjust upcoming reminders from your dashboard.",
  },
  {
    q: "Can I pause it for a specific client?",
    a: "Yes. Pause a single invoice anytime — for a client who's traveling, disputing a line item, or just needs space. Resume when you're ready.",
  },
  {
    q: "What happens when they pay?",
    a: "GentleTap syncs with QuickBooks. The moment an invoice balance hits zero, reminders for that invoice stop automatically.",
  },
] as const;

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

          <div className="mx-auto mt-14 max-w-xl rounded-2xl border border-border bg-card px-6 py-5 text-left shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Early access
            </p>
            <blockquote className="mt-3 text-sm leading-relaxed text-foreground/90">
              &ldquo;I used to rewrite the same &lsquo;just checking in&rsquo; email for a week.
              GentleTap sent something I&apos;d actually send — on day five, not day twenty.&rdquo;
            </blockquote>
            <p className="mt-3 text-xs text-muted">
              — Beta user, independent consultant
            </p>
          </div>
        </section>

        <section className="border-y border-border bg-card py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="text-lg leading-relaxed text-foreground/90 sm:text-xl">
              You finished the project. You sent the invoice. Now it&apos;s twelve days late and
              you don&apos;t know whether to follow up or give it another week — because you
              don&apos;t want to sound pushy, but you also can&apos;t keep floating the cost.
            </p>
            <p className="mt-6 text-muted">
              GentleTap handles the follow-up so you don&apos;t have to choose between getting
              paid and keeping the client.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold">How it works</h2>
            <p className="mt-2 text-center text-sm text-muted">
              Three steps. Under five minutes. Then it runs quietly in the background.
            </p>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {STEPS.map((item, i) => (
                <div key={item.title} className="text-center md:text-left">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="preview" className="border-y border-border bg-card py-20">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-center text-2xl font-bold">This is what Sarah would receive</h2>
            <p className="mt-2 text-center text-sm text-muted">
              A completed example — your real drafts use your invoice data and client history.
            </p>
            <div className="mt-8">
              <PreviewDemo />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold">Questions before you sign up</h2>
          <p className="mt-2 text-center text-sm text-muted">
            The things every freelancer asks first.
          </p>
          <dl className="mt-10 space-y-6">
            {FAQ.map((item) => (
              <div key={item.q} className="card">
                <dt className="font-semibold">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24 scroll-mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Simple, transparent pricing</h2>
            <p className="mt-2 text-muted">
              Start free. One recovered invoice pays for months of GentleTap.
            </p>
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
      <SiteFooter />
    </>
  );
}
