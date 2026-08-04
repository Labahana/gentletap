import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { PreviewDemo } from "@/components/preview-demo";
import { PricingGrid } from "@/components/pricing-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HOME_FAQ } from "@/lib/seo-content";
import { PRICING_PLANS } from "@/lib/pricing";
import {
  DEFAULT_DESCRIPTION,
  faqJsonLd,
  organizationJsonLd,
  pageMetadata,
  productPricingJsonLd,
  softwareApplicationJsonLd,
  webPageJsonLd,
  websiteJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Automated QuickBooks Invoice Reminders for Freelancers | GentleTap",
  description: DEFAULT_DESCRIPTION,
  path: "/",
  ogTitle: "GentleTap — Stop chasing overdue invoices without sounding pushy.",
});

const STEPS = [
  {
    title: "Connect QuickBooks Online or FreshBooks",
    body: "Import open invoices and client details without changing how you already invoice.",
  },
  {
    title: "Preview a reminder in your voice",
    body: "GentleTap drafts a warm-to-firm sequence. Edit or approve before anything sends.",
  },
  {
    title: "Let the sequence run",
    body: "Follow-ups send from Gmail and stop the moment the invoice balance is paid.",
  },
] as const;

const OUTCOMES = [
  {
    title: "Get every follow-up sent on time",
    body: "No invoice disappears because you were busy delivering client work. The cadence runs whether you remember or not.",
  },
  {
    title: "Protect the relationship while you collect",
    body: "Warm-to-firm escalation that sounds like you — not robotic or threatening collections language.",
  },
  {
    title: "See payment land, then stop automatically",
    body: "QuickBooks or FreshBooks payment data ends the sequence so clients never get an unnecessary chase.",
  },
  {
    title: "Recover more without a collections job",
    body: "One dashboard shows what's overdue, what was sent, and what needs your attention.",
  },
] as const;

const PAIN = [
  {
    title: "Follow-ups get delayed",
    body: "You're delivering work — chasing invoices slips to next week, then the week after.",
  },
  {
    title: "“Just checking in” feels awkward",
    body: "Writing the email is harder than the work that earned the invoice.",
  },
  {
    title: "Reminders stay inconsistent",
    body: "Some clients get chased; others slip through — and you never know which.",
  },
] as const;

const PERSONAS = [
  {
    title: "Freelancers",
    body: "Stop spending evenings writing payment follow-ups. Automate the chase and stay in delivery mode.",
  },
  {
    title: "Consultants",
    body: "Keep client relationships strong while asking for a clear payment date — calmly, on schedule.",
  },
  {
    title: "Small agencies",
    body: "Give every overdue invoice a consistent next step without hiring a collections team.",
  },
] as const;

const INTEGRATIONS = [
  { name: "QuickBooks Online", status: "Live", href: "/integrations/quickbooks" },
  { name: "FreshBooks", status: "Live", href: "/integrations/freshbooks" },
  { name: "CSV import", status: "Available", href: "/signup" },
  { name: "Xero", status: "Coming soon", href: "/xero-invoice-reminders" },
] as const;

const COMPARE_ROWS = [
  { feature: "Uses accounting data", native: "Yes", manual: "No", gentletap: "Yes" },
  { feature: "Personalized per client", native: "Limited", manual: "Depends on you", gentletap: "Yes" },
  { feature: "Sends from your inbox", native: "Platform mail", manual: "Yes", gentletap: "Yes — Gmail" },
  { feature: "Multi-step escalation", native: "Limited", manual: "Manual", gentletap: "Yes" },
  { feature: "Stops after payment", native: "Platform-dependent", manual: "You track it", gentletap: "Yes — auto" },
  { feature: "Review before sending", native: "Limited", manual: "Yes", gentletap: "Yes" },
] as const;

const LANDING_FAQ = [
  ...HOME_FAQ.slice(0, 5),
  {
    q: "Is GentleTap a debt collection agency?",
    a: "No. GentleTap is invoice follow-up software you control — reminders from your Gmail in your voice. It does not buy debt, threaten clients, or act as a third-party collector.",
  },
  {
    q: "Can I pause one invoice?",
    a: "Yes. Pause or resume any invoice's sequence anytime. The rest of your follow-ups keep running.",
  },
  {
    q: "Does it send WhatsApp messages?",
    a: "On Pro+ ($39/mo) and Team: email sends first, then a short WhatsApp nudge ~3 hours later on early steps. Starter and Pro are email-only.",
  },
] as const;

const WORKFLOW_PANELS = [
  { label: "1", title: "Open invoices", detail: "Synced balances & due dates" },
  { label: "2", title: "AI draft", detail: "Written for this client" },
  { label: "3", title: "Preview & edit", detail: "You approve first" },
  { label: "4", title: "Scheduled sequence", detail: "Warm → firm over time" },
  { label: "5", title: "Paid → stopped", detail: "Balance hits zero" },
] as const;

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          websiteJsonLd(),
          webPageJsonLd(
            "GentleTap — Automated invoice follow-up for freelancers",
            DEFAULT_DESCRIPTION,
            "/",
          ),
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          productPricingJsonLd(),
          faqJsonLd(LANDING_FAQ),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/8 via-transparent to-transparent"
          />
          <div className="relative mx-auto max-w-6xl px-6 py-16 text-center lg:py-24">
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
              Invoice follow-up for freelancers and small teams
            </p>
            <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Stop chasing overdue invoices{" "}
              <span className="text-accent">without sounding pushy.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              GentleTap drafts and sends personalized payment reminders from your Gmail, syncs with
              QuickBooks Online and FreshBooks, and stops automatically when your client pays.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/signup" className="btn-primary min-w-[220px]">
                Start free — no credit card
              </Link>
              <Link href="#demo" className="btn-secondary min-w-[220px]">
                See a real reminder
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted">
              QuickBooks Online + FreshBooks · Gmail-native · Free for 5 collections
            </p>
          </div>
        </section>

        {/* Pain */}
        <section className="border-b border-border bg-card/40 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold sm:text-3xl">
              You did the work. Why are you still chasing the money?
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {PAIN.map((item) => (
                <div key={item.title}>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-10 max-w-xl text-center text-muted">
              GentleTap turns invoice follow-up into a quiet, repeatable workflow.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              Connect once. Review the message. Get paid.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              Three steps. Under five minutes. Then reminders run quietly in the background.
            </p>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {STEPS.map((item, i) => (
                <div key={item.title}>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/signup" className="btn-primary inline-flex">
                See how it works — start free
              </Link>
            </div>
          </div>
        </section>

        {/* Product demo */}
        <section id="demo" className="scroll-mt-20 border-y border-border bg-card py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              From overdue invoice to automatic follow-up
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              See exactly what your client sees — and what stops when they pay.
            </p>

            <ol className="mt-10 grid gap-3 sm:grid-cols-5">
              {WORKFLOW_PANELS.map((panel) => (
                <li
                  key={panel.title}
                  className="rounded-xl border border-border bg-background/80 px-4 py-4 text-center"
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {panel.label}
                  </span>
                  <p className="mt-2 text-sm font-semibold">{panel.title}</p>
                  <p className="mt-1 text-xs text-muted">{panel.detail}</p>
                </li>
              ))}
            </ol>

            <div className="mx-auto mt-10 max-w-2xl">
              <PreviewDemo />
            </div>
            <p className="mt-6 text-center text-sm text-muted">
              A completed example — your real drafts use your invoice data and client history.
            </p>
            <div className="mt-8 text-center">
              <Link href="/signup" className="btn-primary inline-flex">
                Start free — no credit card
              </Link>
            </div>
          </div>
        </section>

        {/* Outcomes */}
        <section id="product" className="scroll-mt-20 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              Get paid without writing another awkward email
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              Features framed around what you actually want: cash in, relationship intact, evenings free.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {OUTCOMES.map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-card/50 px-6 py-5">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-muted">
              On Pro+ ($39/mo): WhatsApp nudges after email on early steps — for clients who miss the
              inbox but still respond on chat.
            </p>
          </div>
        </section>

        {/* Integrations */}
        <section id="integrations" className="scroll-mt-20 border-y border-border bg-card/40 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              Works with the tools you already use
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {INTEGRATIONS.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="rounded-xl border border-border bg-background px-5 py-5 transition-colors hover:border-accent/50"
                >
                  <p className="font-semibold">{item.name}</p>
                  <p
                    className={`mt-2 text-xs font-medium uppercase tracking-wide ${
                      item.status === "Live" || item.status === "Available"
                        ? "text-accent"
                        : "text-muted"
                    }`}
                  >
                    {item.status}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Personas */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">Built for owner-operators</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              The simplest way to follow up on overdue invoices without becoming a collections
              department.
            </p>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {PERSONAS.map((item) => (
                <div key={item.title} className="rounded-xl border border-border px-5 py-5">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Early proof */}
        <section className="border-y border-border bg-card py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Early access feedback
            </p>
            <blockquote className="mt-6 text-lg leading-relaxed text-foreground/90 sm:text-xl">
              &ldquo;I used to rewrite the same &lsquo;just checking in&rsquo; email for a week.
              GentleTap sent something I&apos;d actually send — on day five, not day twenty.&rdquo;
            </blockquote>
            <p className="mt-4 text-sm text-muted">— Beta user, independent consultant</p>
            <p className="mt-6 text-sm text-muted">
              Named case studies coming as we measure recoveries with permission. Until then: preview
              every message, send from your Gmail, stop when paid.
            </p>
          </div>
        </section>

        {/* Comparison */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              Why not just use QuickBooks or FreshBooks reminders?
            </h2>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-3 font-semibold" />
                    <th className="py-3 pr-3 font-semibold text-muted">Native reminders</th>
                    <th className="py-3 pr-3 font-semibold text-muted">Manual follow-up</th>
                    <th className="py-3 font-semibold text-accent">GentleTap</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.feature} className="border-b border-border/70">
                      <td className="py-3 pr-3 font-medium">{row.feature}</td>
                      <td className="py-3 pr-3 text-muted">{row.native}</td>
                      <td className="py-3 pr-3 text-muted">{row.manual}</td>
                      <td className="py-3 font-medium">{row.gentletap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/quickbooks-reminders-vs-gentletap" className="text-sm font-medium text-accent hover:underline">
                Full QuickBooks comparison →
              </Link>
              <Link href="/signup" className="btn-primary">
                Start free — no credit card
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-y border-border bg-card/40 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">Simple pricing. Start free.</h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted">
                If GentleTap helps recover one overdue invoice, it can pay for itself many times over.
                No recovery guarantee — just a workflow that actually runs.
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
          </div>
        </section>

        {/* Security / control */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              You stay in control of every message
            </h2>
            <ul className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
              <li>
                <strong className="font-medium text-foreground">Read-only accounting access</strong> —
                QuickBooks Online and FreshBooks sync invoices and balances. We don&apos;t create or
                edit your books.
              </li>
              <li>
                <strong className="font-medium text-foreground">Gmail sending permission</strong> —
                reminders send as you; replies come back to your inbox.
              </li>
              <li>
                <strong className="font-medium text-foreground">Preview before go-live</strong> —
                approve drafts for your real invoices before autopilot starts.
              </li>
              <li>
                <strong className="font-medium text-foreground">Pause anytime</strong> — stop one
                invoice or the whole sequence without losing history.
              </li>
              <li>
                <strong className="font-medium text-foreground">Payment detection</strong> — when the
                balance hits zero, email and WhatsApp both stop.
              </li>
            </ul>
            <p className="mt-6 text-center text-sm text-muted">
              Details on data handling:{" "}
              <Link href="/privacy" className="text-accent hover:underline">
                Privacy policy
              </Link>
              {" · "}
              <Link href="/contact" className="text-accent hover:underline">
                Contact support
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-y border-border bg-card/40 py-16">
          <div className="mx-auto max-w-2xl px-6">
            <h2 className="text-center text-2xl font-bold">Common questions</h2>
            <dl className="mt-10 space-y-5">
              {LANDING_FAQ.map((item) => (
                <div key={item.q} className="rounded-xl border border-border bg-background px-5 py-4">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-8 text-center text-sm text-muted">
              More reading:{" "}
              <Link href="/how-to-follow-up-on-overdue-invoices" className="text-accent hover:underline">
                overdue follow-up guide
              </Link>
              {" · "}
              <Link
                href="/invoice-follow-up-email-templates-for-freelancers"
                className="text-accent hover:underline"
              >
                email templates
              </Link>
              {" · "}
              <Link href="/compare" className="text-accent hover:underline">
                compare tools
              </Link>
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 lg:py-28">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get paid without making invoice follow-up your job
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted">
              Start with five free collections. Connect your accounting system, preview your first
              message, and decide when you&apos;re ready to automate.
            </p>
            <Link href="/signup" className="btn-primary mt-8 inline-flex min-w-[220px]">
              Start free — no credit card
            </Link>
            <p className="mt-4 text-sm text-muted">No long setup. No contract. Pause anytime.</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
