import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  HOME_FAQ,
  INVOICE_FOLLOW_UP_TEMPLATES,
  TEMPLATE_TIPS,
} from "@/lib/seo-content";
import {
  faqJsonLd,
  organizationJsonLd,
  pageMetadata,
  productPricingJsonLd,
  softwareApplicationJsonLd,
  webPageJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Invoice Follow-Up Email Templates for Freelancers",
  description:
    "Free invoice follow-up email templates for freelancers — copy, customize, and send. Polite payment reminders from due date through 30 days overdue. Automate with GentleTap + QuickBooks.",
  path: "/invoice-follow-up-email-templates-for-freelancers",
  keywords: [
    "invoice follow-up email templates for freelancers",
    "freelancer invoice reminder email",
    "payment follow up email template",
    "overdue invoice email template",
    "how to follow up on unpaid invoices",
    "invoice collection email examples",
    "polite payment reminder email",
  ],
});

const TEMPLATE_FAQ = [
  {
    q: "When should I send my first invoice follow-up?",
    a: "Many freelancers send a friendly reminder on the due date, then again at 3 and 7 days overdue. Adjust for client relationships — long-term clients may deserve an extra day; new clients may need an earlier nudge.",
  },
  {
    q: "How do I follow up without damaging the client relationship?",
    a: "Keep messages short, factual, and assumptive-positive (e.g. 'checking whether this landed on your side'). Reference the invoice number and payment link every time so it feels administrative, not personal.",
  },
  {
    q: "Can I automate these templates with QuickBooks?",
    a: "Yes. GentleTap connects to QuickBooks Online, personalizes follow-ups per invoice with AI, sends from your Gmail, and stops automatically when the balance hits zero — so you don't copy-paste templates every month.",
  },
  {
    q: "What placeholders should I replace in these templates?",
    a: "Swap {{client_name}}, {{invoice_number}}, {{amount}}, {{due_date}}, {{payment_link}}, and {{your_name}} with your real values. QuickBooks payment links work well for one-click pay.",
  },
  ...HOME_FAQ.slice(0, 2),
] as const;

export default function InvoiceFollowUpTemplatesPage() {
  const title = "Invoice follow-up email templates for freelancers";
  const description =
    "Copy-paste invoice follow-up email templates for freelancers — from due-date reminders to final notices. Automate the sequence with GentleTap and QuickBooks.";

  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(title, description, "/invoice-follow-up-email-templates-for-freelancers"),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Invoice follow-up templates",
              path: "/invoice-follow-up-email-templates-for-freelancers",
            },
          ]),
          organizationJsonLd(),
          softwareApplicationJsonLd(),
          productPricingJsonLd(),
          faqJsonLd(TEMPLATE_FAQ),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Free templates · Freelancers & consultants
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            Invoice follow-up email templates for freelancers
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            Unpaid invoices are normal — awkward follow-ups don&apos;t have to be. Use these
            copy-paste email templates to chase payment politely, from the due date through 30 days
            overdue. When you&apos;re ready to stop writing them yourself, GentleTap automates the
            same sequence from QuickBooks and Gmail.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Automate follow-ups free
            </Link>
            <Link href="/quickbooks-payment-reminders" className="btn-secondary">
              QuickBooks reminders
            </Link>
            <Link href="/how-to-follow-up-on-overdue-invoices" className="btn-secondary">
              Overdue invoice guide
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">5 invoice follow-up email templates</h2>
            <p className="mt-4 leading-relaxed text-muted">
              Replace the placeholders in <code className="rounded bg-background px-1.5 py-0.5 text-sm">{"{{brackets}}"}</code>{" "}
              with your client and invoice details. Send from your own inbox so clients recognize you.
            </p>
            <div className="mt-8 space-y-8">
              {INVOICE_FOLLOW_UP_TEMPLATES.map((template) => (
                <div key={template.id} className="card">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">{template.title}</h3>
                    <span className="text-xs font-medium uppercase tracking-wide text-accent">
                      {template.when}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    Subject: <span className="font-normal text-muted">{template.subject}</span>
                  </p>
                  <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 text-sm leading-relaxed text-muted">
                    {template.body}
                  </pre>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Tips for freelancer invoice follow-ups</h2>
            <ul className="space-y-3 text-muted">
              {TEMPLATE_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 leading-relaxed">
                  <span className="text-accent" aria-hidden>
                    ·
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Manual templates vs automated follow-ups</h2>
            <p className="leading-relaxed text-muted">
              Templates work when you have a handful of open invoices. Once you&apos;re juggling
              multiple clients, copying subject lines and tracking who got which nudge becomes
              another unpaid admin task.
            </p>
            <p className="leading-relaxed text-muted">
              GentleTap reads unpaid invoices from{" "}
              <Link href="/integrations/quickbooks" className="text-accent hover:underline">
                QuickBooks Online
              </Link>
              , drafts personalized follow-ups in your voice, and sends from{" "}
              <strong className="font-medium text-foreground">your Gmail</strong> — with sequences
              that escalate politely and stop when payment lands. Same intent as these templates;
              zero copy-paste.
            </p>
            <Link
              href="/quickbooks-reminders-vs-gentletap"
              className="inline-block text-sm font-medium text-accent hover:underline"
            >
              Compare QuickBooks built-in reminders vs GentleTap →
            </Link>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Common questions</h2>
            <dl className="mt-8 space-y-6">
              {TEMPLATE_FAQ.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Stop copy-pasting payment reminders</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks, preview AI drafts for your real invoices, and turn on autopilot.
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
