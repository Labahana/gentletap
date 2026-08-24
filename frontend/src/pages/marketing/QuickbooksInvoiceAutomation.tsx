import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { SEO_KEYWORD_CLUSTERS, breadcrumbJsonLd, faqJsonLd, howToJsonLd, webPageJsonLd } from '../../data/seo';

const PATH = '/quickbooks-invoice-automation';
const PAGE_TITLE = 'How to Automate QuickBooks Invoice Follow-Up (Beyond Built-In Reminders)';
const PAGE_DESCRIPTION =
  "QuickBooks Online has basic payment reminders — three steps, fixed text, sent from Intuit's servers. Here's how to set those up, where they fall short, and how to fully automate follow-up from your own Gmail.";

const STEPS = [
  {
    name: "Turn on QuickBooks' built-in reminders",
    text: 'In QuickBooks Online: Settings → Account and settings → Sales → Reminders. Set up to three reminder steps with your timing (before/after due date) and edit the email text.',
  },
  {
    name: 'Know the limits',
    text: "Built-in reminders cap at three steps, send the same template to every client, come from a QuickBooks address rather than your Gmail, and can't adapt tone to how overdue an invoice is.",
  },
  {
    name: 'Connect GentleTap for the full cadence',
    text: 'Link QuickBooks and Gmail to GentleTap. It reads your open invoices, drafts each reminder step with AI in your voice, and sends from your Gmail — pre-due through day 30+.',
  },
  {
    name: 'Preview, then autopilot',
    text: "Review AI drafts for your real invoices, edit anything, then turn on the sequence. GentleTap stops each invoice's reminders the moment QuickBooks shows the balance paid.",
  },
];

const FAQ = [
  {
    q: 'Does QuickBooks automatically send invoice reminders?',
    a: "It can — Settings → Account and settings → Sales → Reminders lets you schedule up to three reminder emails. They use one template for all clients and send from QuickBooks' mail servers.",
  },
  {
    q: 'How many reminder steps does QuickBooks support?',
    a: 'Three. For light chasing that is enough; for a real escalation sequence (pre-due through day 30+, with tone that firms up per step) you need an add-on like GentleTap.',
  },
  {
    q: 'Can QuickBooks reminders come from my Gmail?',
    a: "No — built-in reminders send from Intuit's servers. GentleTap sends follow-up from your own Gmail so replies come back to you and messages read as personal email.",
  },
  {
    q: 'Is GentleTap safe to connect to QuickBooks?',
    a: "GentleTap uses Intuit's official OAuth with read access to invoices and customers — the same connection type used by every app in the QuickBooks App Store. You can disconnect anytime.",
  },
];

export const QuickbooksInvoiceAutomation: React.FC = () => (
  <MarketingShell>
    <Seo
      title="How to Automate QuickBooks Invoice Follow-Up"
      description={PAGE_DESCRIPTION}
      path={PATH}
      keywords={[...SEO_KEYWORD_CLUSTERS.quickbooks, 'quickbooks invoice automation', 'automate quickbooks follow up']}
      jsonLd={[
        webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, PATH),
        breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'QuickBooks invoice automation', path: PATH }]),
        howToJsonLd('How to automate QuickBooks invoice follow-up', PAGE_DESCRIPTION, STEPS),
        faqJsonLd(FAQ),
      ]}
    />
    <article className="max-w-3xl mx-auto px-6 py-14">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'QuickBooks invoice automation' }]} />
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">QuickBooks guide</p>
      <h1 className="mt-3 text-4xl font-extrabold text-gray-900 leading-tight">{PAGE_TITLE}</h1>
      <p className="mt-5 text-lg text-gray-600 leading-relaxed">
        QuickBooks Online ships with payment reminders — useful, but capped at three steps, one template,
        and sent from Intuit's servers instead of your inbox. This guide sets up the built-in version
        properly, then shows what full automation looks like.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
          Automate with GentleTap free
        </Link>
        <Link to="/quickbooks-reminders-vs-gentletap" className="border border-gray-300 hover:border-blue-400 text-gray-700 font-medium px-5 py-2.5 rounded-lg transition-colors">
          Built-in vs GentleTap
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">The four-step setup</h2>
        <ol className="space-y-5">
          {STEPS.map((step, index) => (
            <li key={step.name} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{step.name}</h3>
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">Step {index + 1}</span>
              </div>
              <p className="mt-2 text-gray-600 leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Where built-in reminders stop — and GentleTap starts</h2>
        <p className="text-gray-700 leading-relaxed">
          QuickBooks's reminders are a checkbox feature: they exist so the answer to "does it do reminders?"
          is yes. Three fixed steps, identical wording for a first-time late payer and a chronic one, and
          delivery from an address your client doesn't recognize.
        </p>
        <p className="text-gray-700 leading-relaxed">
          GentleTap runs a real cadence — a friendly nudge before the due date, due-date note, day 3, day 7,
          day 14, and beyond — with AI drafting each step from the client's history and the invoice's age.
          Messages send from your Gmail, and every sequence stops the moment the balance clears.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Common questions</h2>
        <dl className="space-y-5">
          {FAQ.map((item) => (
            <div key={item.q} className="bg-white rounded-2xl border border-gray-200 p-6">
              <dt className="font-semibold text-gray-900">{item.q}</dt>
              <dd className="mt-2 text-gray-600 leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 bg-blue-600 rounded-2xl p-8 text-center text-white">
        <h2 className="text-xl font-bold mb-2">Run the full cadence on your QuickBooks invoices</h2>
        <p className="mx-auto max-w-lg text-blue-100 mb-5">
          Connect QuickBooks and Gmail, preview AI drafts for your real invoices, and turn on autopilot — free for up to 5 collections a month.
        </p>
        <Link to="/signup" className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
          Start free — no credit card
        </Link>
      </section>
    </article>
  </MarketingShell>
);
