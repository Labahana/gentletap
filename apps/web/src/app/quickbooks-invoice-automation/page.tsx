import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  SEO_KEYWORD_CLUSTERS,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const PATH = "/quickbooks-invoice-automation";
const PAGE_TITLE = "How to Automate QuickBooks Invoice Follow-Up (Beyond Built-In Reminders)";
const PAGE_DESCRIPTION =
  "QuickBooks Online has basic payment reminders — three steps, fixed text, sent from Intuit's servers. Here's how to set those up, where they fall short, and how to fully automate follow-up from your own Gmail.";

export const metadata: Metadata = pageMetadata({
  title: "How to Automate QuickBooks Invoice Follow-Up",
  description: PAGE_DESCRIPTION,
  path: PATH,
  keywords: [...SEO_KEYWORD_CLUSTERS.quickbooks, "quickbooks invoice automation", "automate quickbooks follow up"],
});

const STEPS = [
  {
    name: "Turn on QuickBooks' built-in reminders",
    text: "In QuickBooks Online: Settings → Account and settings → Sales → Reminders. Set up to three reminder steps with your timing (before/after due date) and edit the email text.",
  },
  {
    name: "Know the limits",
    text: "Built-in reminders cap at three steps, send the same template to every client, come from a QuickBooks address rather than your Gmail, and can't adapt tone to how overdue an invoice is.",
  },
  {
    name: "Connect GentleTap for the full cadence",
    text: "Link QuickBooks and Gmail to GentleTap. It reads your open invoices, drafts each reminder step with AI in your voice, and sends from your Gmail — pre-due through day 30+.",
  },
  {
    name: "Preview, then autopilot",
    text: "Review AI drafts for your real invoices, edit anything, then turn on the sequence. GentleTap stops each invoice's reminders the moment QuickBooks shows the balance paid.",
  },
];

const FAQ = [
  {
    q: "Does QuickBooks automatically send invoice reminders?",
    a: "It can — Settings → Account and settings → Sales → Reminders lets you schedule up to three reminder emails. They use one template for all clients and send from QuickBooks' mail servers.",
  },
  {
    q: "How many reminder steps does QuickBooks support?",
    a: "Three. For light chasing that's enough; for a real escalation sequence (pre-due through day 30+, with tone that firms up per step) you need an add-on like GentleTap.",
  },
  {
    q: "Can QuickBooks reminders come from my Gmail?",
    a: "No — built-in reminders send from Intuit's servers. GentleTap sends follow-up from your own Gmail so replies come back to you and messages read as personal email.",
  },
  {
    q: "Is GentleTap safe to connect to QuickBooks?",
    a: "GentleTap uses Intuit's official OAuth with read access to invoices and customers — the same connection type used by every app in the QuickBooks App Store. You can disconnect anytime.",
  },
];

export default function QuickBooksInvoiceAutomationPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, PATH),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "QuickBooks invoice automation", path: PATH },
          ]),
          howToJsonLd("How to automate QuickBooks invoice follow-up", PAGE_DESCRIPTION, STEPS),
          faqJsonLd(FAQ),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            QuickBooks guide
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {PAGE_TITLE}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            QuickBooks Online ships with payment reminders — useful, but capped at three steps,
            one template, and sent from Intuit&apos;s servers instead of your inbox. This guide
            sets up the built-in version properly, then shows what full automation looks like.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Automate with GentleTap free
            </Link>
            <Link href="/quickbooks-reminders-vs-gentletap" className="btn-secondary">
              Built-in vs GentleTap
            </Link>
          </div>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">The four-step setup</h2>
            <ol className="mt-8 space-y-6">
              {STEPS.map((step, index) => (
                <li key={step.name} className="card">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-lg font-semibold">{step.name}</h3>
                    <span className="text-xs font-medium uppercase tracking-wide text-accent">
                      Step {index + 1}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Where built-in reminders stop — and GentleTap starts</h2>
            <p className="leading-relaxed text-muted">
              QuickBooks&apos;s reminders are a checkbox feature: they exist so the answer to
              &quot;does it do reminders?&quot; is yes. Three fixed steps, identical wording for a
              first-time late payer and a chronic one, and delivery from an address your client
              doesn&apos;t recognize.
            </p>
            <p className="leading-relaxed text-muted">
              GentleTap runs a real cadence — a friendly nudge before the due date, due-date note,
              day 3, day 7, day 14, and beyond — with AI drafting each step from the client&apos;s
              history and the invoice&apos;s age. Messages send from{" "}
              <Link href="/features/send-from-gmail" className="text-accent hover:underline">
                your Gmail
              </Link>
              , and every sequence{" "}
              <Link href="/features/auto-stop-on-payment" className="text-accent hover:underline">
                stops the moment the balance clears
              </Link>
              . The full comparison lives on{" "}
              <Link href="/quickbooks-reminders-vs-gentletap" className="text-accent hover:underline">
                QuickBooks reminders vs GentleTap
              </Link>
              .
            </p>
          </section>

          <section className="mt-14">
            <h2 className="text-2xl font-bold">Common questions</h2>
            <dl className="mt-8 space-y-6">
              {FAQ.map((item) => (
                <div key={item.q} className="card">
                  <dt className="font-semibold">{item.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-muted">{item.a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-14 rounded-2xl border border-accent/30 bg-accent/5 px-6 py-8 text-center">
            <h2 className="text-xl font-bold">Run the full cadence on your QuickBooks invoices</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect QuickBooks and Gmail, preview AI drafts for your real invoices, and turn on
              autopilot — free for up to 5 collections a month.
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
