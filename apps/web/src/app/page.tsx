import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { PreviewDemo } from "@/components/preview-demo";
import { PricingGrid } from "@/components/pricing-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HOME_FAQ, SEO_FEATURES, SEO_USE_CASES, AI_DISCOVERY_FAQ, COMPETITOR_COMPARISON, GENTLETAP_DEFINITION } from "@/lib/seo-content";
import { PRICING_PLANS, PRICING_VALUE_PROPS } from "@/lib/pricing";
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
  ogTitle: "GentleTap — Get paid. Keep the relationship.",
});

const STEPS = [
  {
    title: "Connect QuickBooks or FreshBooks",
    body: "We import unpaid invoices — balances, due dates, and client history — so automated payment reminders start from real data.",
  },
  {
    title: "Preview the message",
    body: "Read AI-drafted invoice follow-ups for your actual clients. Approve once — they read like you wrote them yourself.",
  },
  {
    title: "Get paid",
    body: "Overdue invoice reminders go out on your behalf. They stop the second payment lands in QuickBooks or FreshBooks.",
  },
] as const;

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          websiteJsonLd(),
          webPageJsonLd(
            "GentleTap — Automated QuickBooks and FreshBooks invoice reminders for freelancers",
            DEFAULT_DESCRIPTION,
            "/",
          ),
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          productPricingJsonLd(),
          faqJsonLd([...HOME_FAQ, ...AI_DISCOVERY_FAQ]),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-6 py-20 text-center lg:py-28">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
            Invoice follow-up for freelancers · QuickBooks & FreshBooks
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Get paid.{" "}
            <span className="text-accent">Keep the relationship.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-xl font-medium text-foreground/90">
            AI-powered invoice follow-up for freelancers and consultants on QuickBooks and FreshBooks.
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            GentleTap drafts warm-to-firm payment reminders in your voice, sends them from Gmail, and
            stops automatically when the invoice balance hits zero.
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
            Under 5 minutes with Gmail + QuickBooks Online or FreshBooks
          </p>
          <p className="mt-3 text-sm">
            <Link href="/how-to-follow-up-on-overdue-invoices" className="text-accent hover:underline">
              Overdue invoice follow-up guide
            </Link>
            {" · "}
            <Link href="/quickbooks-payment-reminders" className="text-accent hover:underline">
              QuickBooks reminders
            </Link>
            {" · "}
            <Link href="/freshbooks-invoice-reminders" className="text-accent hover:underline">
              FreshBooks reminders
            </Link>
            {" · "}
            <Link
              href="/invoice-follow-up-email-templates-for-freelancers"
              className="text-accent hover:underline"
            >
              Email templates
            </Link>
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

        <section id="what-is-gentletap" className="border-y border-border bg-card/50 py-16 scroll-mt-20">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="text-2xl font-bold">What is GentleTap?</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">{GENTLETAP_DEFINITION}</p>
            <p className="mt-4 text-sm text-muted">
              <Link href="/quickbooks-reminders-vs-gentletap" className="font-medium text-accent hover:underline">
                Full comparison vs QuickBooks reminders →
              </Link>
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-4xl px-6">
            <h2 className="text-center text-2xl font-bold">How GentleTap compares to alternatives</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted">
              Built for freelancers who invoice in QuickBooks or FreshBooks — not enterprise AR teams.
            </p>
            <div className="mt-10 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 font-semibold">Alternative</th>
                    <th className="py-3 pr-4 font-semibold text-muted">Typical limitation</th>
                    <th className="py-3 font-semibold text-accent">GentleTap advantage</th>
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
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h2 className="text-2xl font-bold">Invoice follow-up that respects your clients</h2>
            <p className="mt-4 text-lg leading-relaxed text-foreground/90 sm:text-xl">
              You finished the project. You sent the invoice. Now it&apos;s twelve days late and
              you don&apos;t know whether to follow up or give it another week — because you
              don&apos;t want to sound pushy, but you also can&apos;t keep floating the cost.
            </p>
            <p className="mt-6 text-muted">
              GentleTap handles accounts receivable follow-up so you don&apos;t have to choose
              between getting paid and keeping the client.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold">Automated payment reminders, built for QuickBooks</h2>
            <p className="mt-2 text-center text-sm text-muted">
              Everything you need to get clients to pay on time — without a collections team.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-2">
              {SEO_FEATURES.map((item) => (
                <div key={item.title} className="card text-left">
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/50 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold">Who uses GentleTap</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {SEO_USE_CASES.map((item) => (
                <div key={item.title} className="text-center md:text-left">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-center text-2xl font-bold">How it works</h2>
            <p className="mt-2 text-center text-sm text-muted">
              Three steps. Under five minutes. Then invoice reminders run quietly in the background.
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
            <h2 className="text-center text-2xl font-bold">Sample overdue invoice reminder email</h2>
            <p className="mt-2 text-center text-sm text-muted">
              A completed example — your real drafts use your invoice data and client history.
            </p>
            <div className="mt-8">
              <PreviewDemo />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-2xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold">Payment reminder software FAQ</h2>
          <p className="mt-2 text-center text-sm text-muted">
            Common questions from freelancers evaluating automated invoice follow up.
          </p>
          <dl className="mt-10 space-y-6">
            {HOME_FAQ.map((item) => (
              <div key={item.q} className="card">
                <dt className="font-semibold">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24 scroll-mt-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Pricing that pays for itself</h2>
            <p className="mx-auto mt-2 max-w-2xl text-muted">
              Start free on up to 5 invoices. Upgrade when you&apos;re ready to automate every
              follow-up — most freelancers recover the cost with a single late payment.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PRICING_VALUE_PROPS.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card/50 px-5 py-4 text-center md:text-left">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
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
