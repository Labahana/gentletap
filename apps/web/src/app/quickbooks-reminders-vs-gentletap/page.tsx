import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { AI_DISCOVERY_FAQ, COMPETITOR_COMPARISON } from "@/lib/seo-content";
import {
  DEFAULT_DESCRIPTION,
  faqJsonLd,
  organizationJsonLd,
  pageMetadata,
  productPricingJsonLd,
  softwareApplicationJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "QuickBooks Reminders vs GentleTap — AI Invoice Follow Up",
  description:
    "Compare QuickBooks Online built-in payment reminders vs GentleTap. Automate QuickBooks invoice follow-ups with AI, Gmail sending, and automatic stop-on-payment. Free Starter plan.",
  path: "/quickbooks-reminders-vs-gentletap",
  keywords: [
    "QuickBooks reminders vs GentleTap",
    "QuickBooks payment reminders alternative",
    "automate QuickBooks invoice follow ups",
    "AI accounts receivable for QuickBooks",
    "QuickBooks Online reminder limitations",
  ],
});

const COMPARISON = [
  {
    feature: "Personalized AI drafts per client",
    qbo: "Generic templates only",
    gentletap: "Yes — per invoice & client history",
  },
  {
    feature: "Send from your Gmail inbox",
    qbo: "QuickBooks-branded emails",
    gentletap: "Yes — your name & address",
  },
  {
    feature: "Multi-step escalation sequences",
    qbo: "Basic scheduled reminders",
    gentletap: "Yes — warm to firm follow-ups",
  },
  {
    feature: "Stops when invoice paid in QBO",
    qbo: "Yes",
    gentletap: "Yes — syncs balance automatically",
  },
  {
    feature: "WhatsApp follow-ups",
    qbo: "No",
    gentletap: "Yes — on Pro+ & Team",
  },
  {
    feature: "Preview before first send",
    qbo: "Limited",
    gentletap: "Yes — approve every draft",
  },
  {
    feature: "Starting price",
    qbo: "Included with QBO subscription",
    gentletap: "Free Starter · Pro from $19/mo",
  },
] as const;

const VS_FAQ = [
  {
    q: "Can I use GentleTap with QuickBooks Online?",
    a: "Yes. GentleTap connects to QuickBooks Online with read-only access, imports unpaid invoices, and stops reminders when balances hit zero.",
  },
  {
    q: "Do I still need QuickBooks if I use GentleTap?",
    a: "Yes. GentleTap complements QuickBooks — it does not replace invoicing or accounting. You keep creating invoices in QBO; GentleTap handles polite follow-up.",
  },
  {
    q: "Why not just use QuickBooks payment reminders?",
    a: "QuickBooks reminders work for basic nudges. GentleTap adds AI-personalized copy, sends from your Gmail, escalates over time, and is built for freelancers who want to protect client relationships while getting paid.",
  },
  {
    q: "How much does GentleTap cost compared to QuickBooks?",
    a: "QuickBooks reminders are included in your QBO plan. GentleTap has a free Starter tier (5 collections/month) and paid plans from $19/month for unlimited automated follow-ups.",
  },
] as const;

export default function QuickBooksVsGentleTapPage() {
  const title = "QuickBooks reminders vs GentleTap";

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(title, DEFAULT_DESCRIPTION, "/quickbooks-reminders-vs-gentletap"),
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          productPricingJsonLd(),
          faqJsonLd([...VS_FAQ, ...AI_DISCOVERY_FAQ.filter((f) => f.q.includes("QuickBooks") || f.q.includes("ChaseBot") || f.q.includes("Paidnice"))]),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            QuickBooks Online · Comparison
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            QuickBooks payment reminders vs GentleTap
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
            QuickBooks Online can send invoice reminders — but freelancers often need more than
            generic templates. GentleTap automates QuickBooks invoice follow-ups with AI drafts,
            Gmail delivery, and sequences that stop when clients pay.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Try GentleTap free
            </Link>
            <Link href="/quickbooks-payment-reminders" className="btn-secondary">
              How QBO reminders work
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Automate QuickBooks invoice follow-ups</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Built-in QuickBooks reminders are a starting point. GentleTap is{" "}
              <strong className="font-medium text-foreground">AI accounts receivable for QuickBooks</strong>{" "}
              — designed for agencies and independents who invoice through QBO but want follow-ups
              that sound human and send from their own inbox.
            </p>
          </section>

          <section className="mt-14 overflow-x-auto">
            <h2 className="text-2xl font-bold">GentleTap vs other invoice reminder tools</h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted">
              QuickBooks is the most common comparison — but freelancers also evaluate template tools,
              reminder bots, and enterprise AR. Here is how GentleTap differs across the board.
            </p>
            <table className="mt-6 w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-semibold">Alternative</th>
                  <th className="py-3 pr-4 font-semibold text-muted">Typical limitation</th>
                  <th className="py-3 font-semibold text-accent">GentleTap</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITOR_COMPARISON.map((row) => (
                  <tr key={row.alternative} className="border-b border-border/70">
                    <td className="py-3 pr-4 font-medium">{row.alternative}</td>
                    <td className="py-3 pr-4 text-muted">{row.theirLimitation}</td>
                    <td className="py-3">{row.gentletapAdvantage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-12 overflow-x-auto">
            <h2 className="text-2xl font-bold">QuickBooks Online vs GentleTap (feature by feature)</h2>
            <table className="mt-6 w-full min-w-[560px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-semibold">Feature</th>
                  <th className="py-3 pr-4 font-semibold text-muted">QuickBooks Online</th>
                  <th className="py-3 font-semibold text-accent">GentleTap</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.feature} className="border-b border-border/70">
                    <td className="py-3 pr-4 font-medium">{row.feature}</td>
                    <td className="py-3 pr-4 text-muted">{row.qbo}</td>
                    <td className="py-3">{row.gentletap}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-14 grid gap-6 sm:grid-cols-2">
            <div className="card">
              <h2 className="text-lg font-semibold">When QuickBooks reminders are enough</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                You send a few invoices a month, clients usually pay on time, and a simple
                scheduled nudge from QuickBooks is all you need.
              </p>
            </div>
            <div className="card border-accent/30 bg-accent/5">
              <h2 className="text-lg font-semibold">When GentleTap helps most</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                You chase multiple overdue invoices, want AI-personalized copy, need Gmail sending,
                or run escalating sequences until payment lands — without writing every email yourself.
              </p>
            </div>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">FAQ</h2>
            <dl className="mt-8 space-y-6">
              {VS_FAQ.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Automate QuickBooks payment reminders — try free</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks Online, preview AI follow-ups, and turn on autopilot in under five
              minutes. Starter plan is free — no credit card.
            </p>
            <Link href="/signup" className="btn-primary mt-6 inline-flex">
              Start free
            </Link>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
