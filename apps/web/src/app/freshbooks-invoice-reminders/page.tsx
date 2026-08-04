import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const PATH = "/freshbooks-invoice-reminders";
const PAGE_TITLE = "How to Chase FreshBooks Invoices (Automated Follow-Up Guide)";
const PAGE_DESCRIPTION =
  "FreshBooks has late payment reminders built in — but limited steps and generic text. Here's how to set them up, and how to automate a full polite escalation sequence from your own Gmail.";

export const metadata: Metadata = pageMetadata({
  title: "FreshBooks Invoice Reminders — Setup & Automation Guide",
  description: PAGE_DESCRIPTION,
  path: PATH,
  keywords: [
    "freshbooks invoice reminders",
    "freshbooks late payment reminders",
    "freshbooks invoice follow up",
    "automate freshbooks reminders",
    "freshbooks payment chasing",
  ],
});

const STEPS = [
  {
    name: "Enable FreshBooks' built-in reminders",
    text: "In FreshBooks: open an invoice or your settings, find Late Payment Reminders, and set up to three reminders at chosen intervals (e.g. 3, 7, 14 days overdue) with editable text.",
  },
  {
    name: "Add late fees if you use them",
    text: "FreshBooks can also apply late fees automatically at a chosen interval — only use this if the fee was in your agreed terms with the client.",
  },
  {
    name: "Connect GentleTap for a full cadence",
    text: "Link FreshBooks and Gmail to GentleTap. It syncs your invoices, drafts each reminder step with AI in your voice, and sends from your Gmail — including a nudge before the due date, which built-in reminders don't do.",
  },
  {
    name: "Preview, then autopilot",
    text: "Review drafts for your real invoices, edit anything, then turn on the sequence. GentleTap stops each invoice's reminders the moment FreshBooks shows the balance paid.",
  },
];

const FAQ = [
  {
    q: "Does FreshBooks send automatic payment reminders?",
    a: "Yes — Late Payment Reminders can be scheduled at intervals after the due date (up to three per invoice), with editable text. They're sent from FreshBooks' mail servers.",
  },
  {
    q: "Can FreshBooks reminders go out before the due date?",
    a: "No — FreshBooks reminders only trigger after the due date passes. Pre-due nudges, which prevent lateness rather than chase it, require a tool like GentleTap.",
  },
  {
    q: "Can FreshBooks reminders send from my own email address?",
    a: "Built-in reminders come from FreshBooks' servers. GentleTap sends from your Gmail, so reminders land as personal follow-up and replies come straight back to you.",
  },
  {
    q: "Does GentleTap work with all FreshBooks plans?",
    a: "GentleTap connects via FreshBooks' official OAuth — if you can log into FreshBooks, you can connect. Invoices sync automatically and each gets its own reminder sequence.",
  },
];

export default function FreshBooksInvoiceRemindersPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, PATH),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "FreshBooks invoice reminders", path: PATH },
          ]),
          howToJsonLd("How to automate FreshBooks invoice follow-up", PAGE_DESCRIPTION, STEPS),
          faqJsonLd(FAQ),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            FreshBooks guide
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {PAGE_TITLE}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            FreshBooks can send late payment reminders for you — a solid start, but only after an
            invoice is already late, with a three-step cap and generic delivery. Here&apos;s the
            right built-in setup, and what a full automated cadence looks like.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Automate with GentleTap free
            </Link>
            <Link href="/compare/freshbooks" className="btn-secondary">
              FreshBooks reminders vs GentleTap
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
            <h2 className="text-2xl font-bold">Prevention beats chasing — the pre-due gap</h2>
            <p className="leading-relaxed text-muted">
              The most effective reminder in any cadence is the friendly nudge sent <em>before</em>{" "}
              the due date — and FreshBooks can&apos;t send it, because its reminders only trigger
              once an invoice is overdue. GentleTap&apos;s sequence starts three days early, when a
              polite heads-up still reads as helpful service rather than chasing.
            </p>
            <p className="leading-relaxed text-muted">
              From there it escalates — due date, day 3, day 7, day 14, beyond — with AI drafting
              each step from the client&apos;s history and the invoice&apos;s age, sent from{" "}
              <Link href="/features/send-from-gmail" className="text-accent hover:underline">
                your Gmail
              </Link>{" "}
              and{" "}
              <Link href="/features/auto-stop-on-payment" className="text-accent hover:underline">
                stopped the moment the balance clears
              </Link>
              . See the head-to-head at{" "}
              <Link href="/compare/freshbooks" className="text-accent hover:underline">
                FreshBooks vs GentleTap
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
            <h2 className="text-xl font-bold">Run the full cadence on your FreshBooks invoices</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted">
              Connect FreshBooks and Gmail, preview AI drafts for your real invoices, and turn on
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
