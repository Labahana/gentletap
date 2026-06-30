import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { HOME_FAQ, SEO_FEATURES } from "@/lib/seo-content";
import {
  DEFAULT_DESCRIPTION,
  faqJsonLd,
  organizationJsonLd,
  pageMetadata,
  softwareApplicationJsonLd,
  productPricingJsonLd,
  webPageJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "QuickBooks Payment Reminders — Automated Invoice Follow Up",
  description:
    "Automate QuickBooks payment reminders for freelancers. AI-drafted invoice follow-ups send from your Gmail and stop when clients pay. Free for 5 invoices — try GentleTap.",
  path: "/quickbooks-payment-reminders",
  keywords: [
    "QuickBooks payment reminders",
    "QuickBooks invoice reminders",
    "automated invoice follow up QuickBooks",
    "payment reminder software QuickBooks",
    "accounts receivable automation QuickBooks",
    "overdue invoice reminders",
  ],
});

const GUIDE_FAQ = [
  ...HOME_FAQ.slice(0, 4),
  {
    q: "Which QuickBooks plans does GentleTap support?",
    a: "GentleTap integrates with QuickBooks Online (Simple Start, Essentials, Plus, and Advanced). QuickBooks Desktop is not supported because it uses a different sync model.",
  },
] as const;

export default function QuickBooksPaymentRemindersPage() {
  const title = "QuickBooks payment reminders for freelancers";
  const description = DEFAULT_DESCRIPTION;

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(title, description, "/quickbooks-payment-reminders"),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "QuickBooks payment reminders", path: "/quickbooks-payment-reminders" },
          ]),
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          productPricingJsonLd(),
          faqJsonLd(GUIDE_FAQ),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Payment reminder software · QuickBooks Online
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Automated QuickBooks payment reminders — without awkward follow-ups
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            Chasing overdue invoices steals billable hours. GentleTap connects to QuickBooks Online,
            drafts personalized payment reminder emails in your voice, and sends them from your Gmail —
            stopping automatically when the invoice is paid.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Start free — no credit card
            </Link>
            <Link href="/#preview" className="btn-secondary">
              See a sample reminder
            </Link>
            <Link
              href="/invoice-follow-up-email-templates-for-freelancers"
              className="btn-secondary"
            >
              Email templates
            </Link>
            <Link href="/how-to-follow-up-on-overdue-invoices" className="btn-secondary">
              Overdue invoice guide
            </Link>
            <Link href="/quickbooks-reminders-vs-gentletap" className="btn-secondary">
              vs QuickBooks reminders
            </Link>
          </div>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Why freelancers use payment reminder software</h2>
            <p className="leading-relaxed text-muted">
              Most freelancers don&apos;t need a full accounts receivable team — they need consistent
              invoice follow up that protects the relationship. Manual &ldquo;just checking in&rdquo;
              emails are easy to postpone, and QuickBooks&apos; default reminders can feel generic.
            </p>
            <p className="leading-relaxed text-muted">
              GentleTap sits between those options:{" "}
              <strong className="font-medium text-foreground">automated invoice collection</strong>{" "}
              with AI drafts you approve once, sent from your real inbox, synced to QuickBooks balances
              in real time.
            </p>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-bold">How GentleTap handles QuickBooks invoice reminders</h2>
            <ol className="mt-6 space-y-4 text-muted">
              <li>
                <strong className="text-foreground">1. Connect QuickBooks Online</strong> — import
                unpaid invoices, client emails, due dates, and payment links (read-only).
              </li>
              <li>
                <strong className="text-foreground">2. Preview AI follow-ups</strong> — see drafts
                per invoice before anything sends.
              </li>
              <li>
                <strong className="text-foreground">3. Autopilot on</strong> — reminders escalate
                politely over time; sequences stop when QuickBooks shows $0 balance.
              </li>
            </ol>
          </section>

          <section className="mt-12 grid gap-6 sm:grid-cols-2">
            {SEO_FEATURES.map((item) => (
              <div key={item.title} className="card">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Common questions</h2>
            <dl className="mt-8 space-y-6">
              {GUIDE_FAQ.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Try automated payment reminders free</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Join freelancers worldwide who use GentleTap to get clients to pay on time — without
              the stress of writing every follow-up themselves.
            </p>
            <Link href="/signup" className="btn-primary mt-6 inline-flex">
              Create free account
            </Link>
            <p className="mt-4 text-sm">
              <Link href="/affiliates" className="text-accent hover:underline">
                YouTube creator? Promote GentleTap and earn 30% recurring commission →
              </Link>
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
