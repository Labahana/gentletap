import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  HOW_TO_FOLLOW_UP_STEPS,
  OVERDUE_FOLLOW_UP_FAQ,
  OVERDUE_FOLLOW_UP_PRINCIPLES,
  OVERDUE_FOLLOW_UP_TIMELINE,
  AI_DISCOVERY_FAQ,
  GENTLETAP_DEFINITION,
} from "@/lib/seo-content";
import {
  SEO_KEYWORD_CLUSTERS,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  organizationJsonLd,
  pageMetadata,
  productPricingJsonLd,
  softwareApplicationJsonLd,
  webPageJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "How to Follow Up on Overdue Invoices (Without Being Annoying)",
  description:
    "A freelancer's guide to following up on overdue invoices — day-by-day timeline, tone tips, and when to escalate. Copy email templates or automate with GentleTap + QuickBooks.",
  path: "/how-to-follow-up-on-overdue-invoices",
  keywords: [...SEO_KEYWORD_CLUSTERS.howTo, ...SEO_KEYWORD_CLUSTERS.templates.slice(0, 3)],
});

const PAGE_TITLE = "How to follow up on overdue invoices without being annoying";
const PAGE_DESCRIPTION =
  "Practical timeline and principles for freelancers chasing late payments — from due-date reminders through day 30, without damaging client relationships.";

export default function HowToFollowUpOnOverdueInvoicesPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, "/how-to-follow-up-on-overdue-invoices"),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Overdue invoice follow-up guide", path: "/how-to-follow-up-on-overdue-invoices" },
          ]),
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          productPricingJsonLd(),
          howToJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, HOW_TO_FOLLOW_UP_STEPS),
          faqJsonLd([...OVERDUE_FOLLOW_UP_FAQ, ...AI_DISCOVERY_FAQ.slice(0, 3)]),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Freelancer guide · QuickBooks & Gmail
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            How to follow up on overdue invoices without being annoying
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            You finished the work. You sent the invoice. Now it&apos;s a week past due and you&apos;re
            staring at a blank email — worried you&apos;ll sound pushy, but you also can&apos;t keep
            floating the cost. This guide is the day-by-day follow-up sequence freelancers use to get
            paid while keeping the relationship intact.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Automate follow-ups free
            </Link>
            <Link
              href="/invoice-follow-up-email-templates-for-freelancers"
              className="btn-secondary"
            >
              Copy email templates
            </Link>
            <Link href="/quickbooks-payment-reminders" className="btn-secondary">
              QuickBooks reminders
            </Link>
          </div>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Why overdue invoice follow-ups feel awkward</h2>
            <p className="leading-relaxed text-muted">
              Freelancers delay follow-ups for the same reason clients delay payment: the task is
              emotionally loaded. You&apos;re not a collections department — you&apos;re someone who
              wants repeat work from this client. The fix isn&apos;t avoiding the email; it&apos;s
              using a <strong className="font-medium text-foreground">consistent, professional script</strong>{" "}
              that escalates tone gradually instead of repeating the same anxious nudge.
            </p>
            <p className="leading-relaxed text-muted">
              If you use{" "}
              <Link href="/integrations/quickbooks" className="text-accent hover:underline">
                QuickBooks Online
              </Link>
              , include the Intuit payment link every time. If you invoice manually, paste your
              Stripe or bank link — friction kills payment speed.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Day-by-day overdue invoice timeline</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Adjust timing for long-term clients (add a day) or large invoices (start earlier). Keep
              one email thread per invoice.
            </p>
            <ol className="mt-8 space-y-6">
              {OVERDUE_FOLLOW_UP_TIMELINE.map((item) => (
                <li key={item.day} className="card">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <span className="text-xs font-medium uppercase tracking-wide text-accent">
                      {item.day}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-sm text-muted">
              Need exact wording?{" "}
              <Link
                href="/invoice-follow-up-email-templates-for-freelancers"
                className="font-medium text-accent hover:underline"
              >
                Copy our 5 freelancer email templates →
              </Link>
            </p>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Four principles that keep follow-ups professional</h2>
            <div className="mt-6 space-y-4">
              {OVERDUE_FOLLOW_UP_PRINCIPLES.map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-card/50 px-5 py-4">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14 space-y-4 rounded-2xl border border-border bg-card/50 px-6 py-6">
            <h2 className="text-lg font-semibold">Automate this sequence instead of copy-pasting</h2>
            <p className="text-sm leading-relaxed text-muted">{GENTLETAP_DEFINITION}</p>
            <Link
              href="/quickbooks-reminders-vs-gentletap"
              className="inline-block text-sm font-medium text-accent hover:underline"
            >
              See how GentleTap compares to QuickBooks reminders and other tools →
            </Link>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Manual follow-ups vs automated reminders</h2>
            <p className="leading-relaxed text-muted">
              The timeline above works. The problem is execution: when you&apos;re busy delivering
              work, follow-ups slip to day 12 instead of day 7 — and tone gets sharper than you
              intended because you&apos;re frustrated.
            </p>
            <p className="leading-relaxed text-muted">
              GentleTap runs the same escalation from{" "}
              <Link href="/quickbooks-payment-reminders" className="text-accent hover:underline">
                QuickBooks payment data
              </Link>
              , drafts each message in your voice, sends from{" "}
              <strong className="font-medium text-foreground">your Gmail</strong>, and stops the
              moment the invoice balance hits zero. You preview drafts once during onboarding — not
              debt-collection blasts from a random inbox.
            </p>
            <Link
              href="/quickbooks-reminders-vs-gentletap"
              className="inline-block text-sm font-medium text-accent hover:underline"
            >
              QuickBooks built-in reminders vs GentleTap →
            </Link>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Common questions</h2>
            <dl className="mt-8 space-y-6">
              {OVERDUE_FOLLOW_UP_FAQ.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Send the follow-up you keep putting off</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks, preview AI drafts for your real invoices, and turn on autopilot — free
              for up to 5 invoices.
            </p>
            <Link href="/signup" className="btn-primary mt-6 inline-flex">
              Start free — no credit card
            </Link>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
