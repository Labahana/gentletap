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
  ogTitle: "GentleTap — Stop chasing. Start getting paid.",
});

const FEATURES = [
  {
    eyebrow: "Sounds like you",
    title: "AI drafts in your voice",
    body: "Each reminder is written for the client, amount, and how overdue it is — warm first, firmer later. Preview before anything sends.",
  },
  {
    eyebrow: "Your inbox",
    title: "Sends from your Gmail",
    body: "Clients see your name, not a noreply@ domain. Replies land in your inbox where they belong.",
  },
  {
    eyebrow: "Accounting sync",
    title: "QuickBooks + FreshBooks",
    body: "Pull unpaid invoices automatically. Or upload a spreadsheet / add one manually — same autopilot.",
  },
  {
    eyebrow: "Stops on a dime",
    title: "Pauses the moment you're paid",
    body: "When the balance hits zero in QuickBooks, FreshBooks, or you mark it paid, the sequence stops. No awkward “already paid” chase.",
  },
  {
    eyebrow: "Multi-channel",
    title: "Email + WhatsApp nudges",
    body: "On Pro+: email first, then a short WhatsApp follow-up a few hours later for clients who miss the inbox.",
  },
  {
    eyebrow: "Smarter per client",
    title: "AI client payment profiles",
    body: "Average days to pay, late rate, and risk level shape tone and timing — so reliable clients get warmth and chronic late payers get clearer asks.",
  },
  {
    eyebrow: "You own the rules",
    title: "Cadence & send windows",
    body: "Edit day offsets, channels, tones, quiet hours, weekends, and pause-all from the Automation control center.",
  },
  {
    eyebrow: "Know when to step in",
    title: "Escalation rules & alerts",
    body: "Flag invoices by days overdue, balance, or reminder step. Get in-app or email alerts — or pause the sequence for a personal touch.",
  },
  {
    eyebrow: "Team-ready",
    title: "Seats, roles & audit log",
    body: "Invite members or viewers on the Team plan. See who changed automation, invites, and account settings.",
  },
] as const;

const STEPS = [
  {
    title: "Connect accounting + Gmail",
    body: "Link QuickBooks Online or FreshBooks (or upload a CSV / add an invoice). Authorize Gmail in about two minutes.",
  },
  {
    title: "Preview AI drafts",
    body: "GentleTap drafts reminders for your real overdue invoices. Edit anything before go-live.",
  },
  {
    title: "Turn on autopilot",
    body: "Sequences run on your cadence. They stop when paid — and respect your pause, quiet hours, and escalation rules.",
  },
] as const;

const PAIN = [
  {
    title: "Follow-ups slip",
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

const LANDING_FAQ = [
  ...HOME_FAQ.slice(0, 5),
  {
    q: "Is GentleTap a debt collection agency?",
    a: "No. GentleTap is invoice follow-up software you control — reminders from your Gmail in your voice. It does not buy debt, threaten clients, or act as a third-party collector.",
  },
  {
    q: "Can I pause one invoice or everything?",
    a: "Yes. Pause a single invoice anytime, or use Pause all in Automation settings (with an optional resume date).",
  },
  {
    q: "Does it send WhatsApp messages?",
    a: "On Pro+ ($39/mo) and Team: email sends first, then a short WhatsApp nudge on early steps. Starter and Pro are email-only.",
  },
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
        {/* Hero — Polsia-style: brand + one headline + one line + CTAs + product visual */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent"
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-accent">
                Accounts receivable, finally quiet
              </p>
              <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
                Stop chasing.
                <br />
                <span className="text-accent">Start getting paid.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted">
                GentleTap drafts personalized payment reminders from your Gmail, syncs QuickBooks
                and FreshBooks, and stops the moment an invoice is paid.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/signup" className="btn-primary min-w-[200px] text-center">
                  Get started free
                </Link>
                <Link href="#how-it-works" className="btn-secondary min-w-[200px] text-center">
                  See how it works →
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted">
                Free up to 5 collections/month · No credit card required
              </p>
            </div>
            <div id="demo" className="scroll-mt-24">
              <PreviewDemo />
            </div>
          </div>
        </section>

        {/* Pain */}
        <section className="border-b border-border bg-card/50 py-14">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold sm:text-3xl">
              Chasing invoices shouldn&apos;t feel like a second job
            </h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {PAIN.map((item) => (
                <div key={item.title}>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features — full product surface */}
        <section id="product" className="scroll-mt-20 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-sm font-medium uppercase tracking-widest text-accent">
              Why GentleTap
            </p>
            <h2 className="mt-3 text-center text-2xl font-bold sm:text-3xl">
              Everything you need to collect — without sounding pushy
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-muted">
              From AI drafts and Gmail to WhatsApp, cadence control, escalation rules, and team
              seats — you own every feature.
            </p>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="rounded-2xl border border-border bg-card px-5 py-5"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {f.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-border bg-card/40 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-sm font-medium uppercase tracking-widest text-accent">
              The flow
            </p>
            <h2 className="mt-3 text-center text-2xl font-bold sm:text-3xl">
              Three steps from overdue to paid
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {STEPS.map((item, i) => (
                <div key={item.title}>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link href="/signup" className="btn-primary inline-flex">
                Start getting paid →
              </Link>
            </div>
          </div>
        </section>

        {/* Integrations strip */}
        <section id="integrations" className="scroll-mt-20 py-14">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Works with how you already invoice</h2>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {[
                { name: "QuickBooks Online", href: "/integrations/quickbooks" },
                { name: "FreshBooks", href: "/integrations/freshbooks" },
                { name: "CSV / spreadsheet", href: "/signup" },
                { name: "Manual invoice", href: "/signup" },
                { name: "Gmail", href: "/features/send-from-gmail" },
                { name: "WhatsApp", href: "/features/whatsapp-reminders" },
              ].map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:border-accent/40"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="border-y border-border bg-[#2c2825] py-16 text-[#faf8f5]">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <blockquote className="text-xl leading-relaxed sm:text-2xl">
              &ldquo;I used to rewrite the same &lsquo;just checking in&rsquo; email for a week.
              GentleTap sent something I&apos;d actually send — on day five, not day twenty.&rdquo;
            </blockquote>
            <p className="mt-5 text-sm text-[#faf8f5]/60">— Beta user, independent consultant</p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 py-16 lg:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <p className="text-center text-sm font-medium uppercase tracking-widest text-accent">
              Pricing
            </p>
            <h2 className="mt-3 text-center text-2xl font-bold sm:text-3xl">
              No surprises. No pressure.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              Start free. Upgrade when you need more. Cancel anytime.
            </p>
            <div className="mt-10">
              <PricingGrid
                plans={PRICING_PLANS.map((p) => ({
                  ...p,
                  checkout_monthly_available: p.id !== "free",
                  checkout_annual_available: p.id !== "free",
                }))}
                freeCta="Start free"
              />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-border bg-card/40 py-16">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-center text-2xl font-bold sm:text-3xl">Questions, answered</h2>
            <dl className="mt-10 space-y-6">
              {LANDING_FAQ.map((item) => (
                <div key={item.q} className="border-b border-border pb-6">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 lg:py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to stop chasing?
            </h2>
            <p className="mt-4 text-muted">
              Set up in minutes. First five collections free. No credit card needed.
            </p>
            <Link href="/signup" className="btn-primary mt-8 inline-flex min-w-[220px]">
              Start getting paid →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
