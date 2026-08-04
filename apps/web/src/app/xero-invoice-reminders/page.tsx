import type { Metadata } from "next";
import Link from "next/link";

import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  pageMetadata,
  webPageJsonLd,
} from "@/lib/seo";

const PATH = "/xero-invoice-reminders";
const PAGE_TITLE = "Xero Invoice Reminders: Your Options (And Where GentleTap Stands)";
const PAGE_DESCRIPTION =
  "Looking for automated Xero invoice reminders? GentleTap doesn't support Xero yet — here's an honest look at Xero's built-in reminders, your options today, and how to hear when Xero support lands.";

export const metadata: Metadata = pageMetadata({
  title: "Xero Invoice Reminders — Honest Options Guide",
  description: PAGE_DESCRIPTION,
  path: PATH,
  keywords: [
    "xero invoice reminders",
    "xero payment reminders automatic",
    "xero invoice follow up",
    "xero dunning",
    "xero reminder software",
  ],
});

const FAQ = [
  {
    q: "Does Xero send automatic invoice reminders?",
    a: "Yes — under Invoice Settings you can enable reminders and configure multiple steps before and after the due date, with editable email text. They're sent from Xero's mail servers.",
  },
  {
    q: "Does GentleTap work with Xero?",
    a: "Not yet. GentleTap currently supports QuickBooks Online and FreshBooks. If you're on Xero, Xero's own invoice reminders are the most direct built-in option today.",
  },
  {
    q: "When will GentleTap support Xero?",
    a: "Xero support is on the roadmap. The fastest way to hear about it is to contact us via the contact page — Xero requests are tracked and answered personally.",
  },
  {
    q: "I use Xero but invoice some clients manually — can I still use GentleTap?",
    a: "GentleTap's CSV invoice import works independently of Xero: import invoices from a CSV and the reminder cadence runs on them. Contact support for details on the import format.",
  },
];

export default function XeroInvoiceRemindersPage() {
  return (
    <>
      <JsonLd
        data={[
          webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, PATH),
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Xero invoice reminders", path: PATH },
          ]),
          faqJsonLd(FAQ),
          organizationJsonLd(),
        ]}
      />
      <SiteHeader />
      <main className="flex-1">
        <article className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">Xero guide</p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
            {PAGE_TITLE}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            Let&apos;s be upfront: <strong className="font-medium text-foreground">GentleTap
            doesn&apos;t support Xero yet.</strong> It connects to QuickBooks Online and FreshBooks
            today. This page is the honest version of what you can do about Xero invoice reminders
            right now — no pretending otherwise to keep you on the site.
          </p>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Option 1: Xero&apos;s built-in invoice reminders</h2>
            <p className="leading-relaxed text-muted">
              Xero&apos;s own reminders are better than most accounting tools&apos;: you can
              schedule multiple steps <em>before and after</em> the due date and edit the email
              text per step. Find them under <strong className="font-medium text-foreground">
              Business → Invoices → Invoice settings → Invoice Reminders</strong>.
            </p>
            <p className="leading-relaxed text-muted">
              The limits: every client gets the same templates, reminders send from Xero&apos;s
              servers rather than your email address, and there&apos;s no adaptation in tone as an
              invoice ages. For many Xero businesses this is genuinely enough — start here.
            </p>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Option 2: Xero-ecosystem chasing tools</h2>
            <p className="leading-relaxed text-muted">
              If you need multi-step sequences with per-client personalization on Xero today,
              dedicated AR tools in the Xero App Store (Chaser and similar) integrate directly.
              They&apos;re built for finance teams — expect more features and more cost than a
              freelancer needs, but they do the job on Xero.
            </p>
          </section>

          <section className="mt-14 space-y-4">
            <h2 className="text-2xl font-bold">Option 3: GentleTap&apos;s CSV import</h2>
            <p className="leading-relaxed text-muted">
              If part of your invoicing happens outside Xero — one-off projects, side clients —
              GentleTap&apos;s CSV invoice import runs the reminder cadence on imported invoices
              without any accounting integration. It&apos;s not a Xero sync, but for a handful of
              invoices it&apos;s a pragmatic bridge.
            </p>
          </section>

          <section className="mt-14 space-y-4 rounded-2xl border border-border bg-card/50 px-6 py-6">
            <h2 className="text-lg font-semibold">Want Xero support? Tell us.</h2>
            <p className="text-sm leading-relaxed text-muted">
              Xero is on the GentleTap roadmap, and requests directly influence what ships next.{" "}
              <Link href="/contact" className="font-medium text-accent hover:underline">
                Send a note via the contact page
              </Link>{" "}
              — you&apos;ll get a personal reply and a heads-up when the integration lands. If you
              also use QuickBooks or FreshBooks anywhere, you can{" "}
              <Link href="/signup" className="font-medium text-accent hover:underline">
                start free today
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
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
