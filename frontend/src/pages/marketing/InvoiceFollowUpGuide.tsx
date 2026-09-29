import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { breadcrumbJsonLd, faqJsonLd, howToJsonLd, webPageJsonLd } from '../../data/seo';

const PATH = '/invoice-follow-up-guide';
const PAGE_TITLE = 'Invoice Follow-Up: The Complete Guide to Getting Paid (2026)';
const PAGE_DESCRIPTION =
  'How to follow up on unpaid invoices without sounding pushy — the reminder ladder, email templates, QuickBooks automation, and WhatsApp, for freelancers.';
const LAST_UPDATED = '2026-09-29';
const LAST_UPDATED_LABEL = 'September 29, 2026';

const TOC: Array<{ id: string; label: string }> = [
  { id: 'what-is-invoice-follow-up', label: 'What is invoice follow-up?' },
  { id: 'reminder-ladder', label: 'The follow-up ladder that works' },
  { id: 'email-templates', label: 'Follow-up email templates' },
  { id: 'automate-quickbooks', label: 'Automating reminders in QuickBooks' },
  { id: 'manual-vs-automated', label: 'Manual vs automated follow-up' },
  { id: 'whatsapp', label: 'Adding WhatsApp reminders' },
  { id: 'tools', label: 'Choosing invoice reminder software' },
  { id: 'faq', label: 'Common questions' },
];

const LADDER: Array<{ stage: string; title: string; body: string }> = [
  {
    stage: '3 days before',
    title: 'A friendly heads-up',
    body: 'A short “invoice #1042 is due Friday” note. Most late payments are disorganisation, not refusal — a nudge before the date clears a surprising share.',
  },
  {
    stage: 'Due date',
    title: '“Due today” reminder',
    body: 'Re-send the invoice with the payment link. Zero awkwardness: you are just flagging the date you already agreed on.',
  },
  {
    stage: 'Day 3 overdue',
    title: 'Warm direct ask',
    body: 'Name the facts plainly and offer an out: “Now 3 days past due — let me know if there’s a hold-up on your side.” One email thread per invoice.',
  },
  {
    stage: 'Day 7 overdue',
    title: 'Firmer, with a next step',
    body: 'Escalate directness, not tone. Restate the amount and due date, and state what happens next (a pause on new work, a late fee per terms).',
  },
  {
    stage: 'Day 14+',
    title: 'Final notice',
    body: 'Clear deadline and consequence. This is where manual follow-ups usually stall — automation keeps the cadence consistent so you do not have to play bad cop.',
  },
];

const AUTOMATE_STEPS: Array<{ name: string; text: string }> = [
  { name: 'Connect QuickBooks', text: 'Read-only OAuth so GentleTap sees unpaid invoices, balances, due dates and client emails.' },
  { name: 'Draft in your voice', text: 'AI writes a personalised reminder per invoice and client history, from warm to firm.' },
  { name: 'Preview and approve', text: 'You check the first drafts before anything sends — nothing goes out you have not seen.' },
  { name: 'Send from your Gmail', text: 'Reminders come from your own inbox, not a generic collections address, so they read like you.' },
  { name: 'Stop when paid', text: 'The moment QuickBooks shows the balance at zero, the sequence halts automatically.' },
];

const COMPARISON: Array<{ dimension: string; manual: string; automated: string }> = [
  { dimension: 'Consistency', manual: 'Depends on you remembering', automated: 'Fires on schedule, every invoice' },
  { dimension: 'Time per week', manual: 'Hours drafting and chasing', automated: 'Minutes approving drafts' },
  { dimension: 'Tone', manual: 'Varies with your mood', automated: 'Consistent, escalating, professional' },
  { dimension: 'Stopping when paid', manual: 'Easy to miss, risks double-chasing', automated: 'Auto-stops on a zero balance' },
  { dimension: 'Scaling', manual: 'Breaks down past a handful of clients', automated: 'Same effort for 5 or 500 invoices' },
];

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'How often should I follow up on an unpaid invoice?',
    a: 'A proven cadence is a heads-up 3 days before, a note on the due date, then day 3, day 7 and day 14 after. Keep one email thread per invoice and escalate directness, not tone.',
  },
  {
    q: 'Is it rude to remind a client about an invoice?',
    a: 'No. You agreed to pay-and-on-time-terms; a polite reminder is normal business. The awkwardness comes from waiting so long that the first follow-up feels accusatory. Early, consistent nudges keep it neutral.',
  },
  {
    q: 'Do invoices with a payment link get paid faster?',
    a: 'Consistently. Removing friction (a clickable link versus “check your bank details”) speeds payment, which is why GentleTap includes the QuickBooks payment link on every reminder.',
  },
  {
    q: 'Can I automate invoice reminders for QuickBooks?',
    a: 'Yes. GentleTap syncs unpaid invoices from QuickBooks Online, drafts AI reminders in your voice, sends them from your Gmail, and stops automatically when the balance hits zero. It also works with FreshBooks.',
  },
  {
    q: 'What is the best free way to chase invoices?',
    a: 'For a handful of invoices, a saved template and a calendar reminder work. Past that, free or low-cost automation wins because it never forgets and never sounds frustrated. GentleTap is free for up to 5 collections a month.',
  },
];

export const InvoiceFollowUpGuide: React.FC = () => (
  <MarketingShell>
    <Seo
      title={PAGE_TITLE}
      description={PAGE_DESCRIPTION}
      path={PATH}
      keywords={['invoice follow up', 'unpaid invoice reminder', 'how to get clients to pay invoices', 'automate invoice reminders quickbooks', 'invoice chasing for freelancers']}
      jsonLd={[
        webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, PATH),
        breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Invoice follow-up guide', path: PATH },
        ]),
        howToJsonLd('How to automate invoice reminders in QuickBooks', 'Connect QuickBooks, draft in your voice, approve, send from Gmail, and auto-stop on payment.', AUTOMATE_STEPS),
        faqJsonLd(FAQ),
      ]}
    />
    <article className="max-w-3xl mx-auto px-6 py-14">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Invoice follow-up guide' }]} />
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">The complete guide · Freelancers &amp; consultants</p>
      <h1 className="mt-3 text-4xl font-extrabold text-gray-900 leading-tight">{PAGE_TITLE}</h1>
      <p className="mt-3 text-sm text-gray-500">
        Last updated <time dateTime={LAST_UPDATED}>{new Date(LAST_UPDATED).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>
      </p>
      <p className="mt-5 text-lg text-gray-600 leading-relaxed">
        Invoice follow-up is the difference between getting paid in a week and getting paid in a month — and
        between keeping a client and losing one over an awkward email. This guide covers the exact reminder
        ladder, ready-to-use email wording, and how freelancers automate the whole thing on top of QuickBooks
        and Gmail so nothing slips and nobody sounds angry.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
          Automate follow-ups free
        </Link>
        <Link to="/invoice-follow-up-email-templates-for-freelancers" className="border border-gray-300 hover:border-blue-400 text-gray-700 font-medium px-5 py-2.5 rounded-lg transition-colors">
          Copy email templates
        </Link>
      </div>

      <nav aria-label="Contents" className="mt-10 bg-white rounded-2xl border border-gray-200 p-6">
        <p className="text-sm font-semibold text-gray-900 mb-3">On this page</p>
        <ul className="space-y-2 text-sm">
          {TOC.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-blue-600 hover:text-blue-700">{s.label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <section id="what-is-invoice-follow-up" className="mt-14 space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900">What is invoice follow-up?</h2>
        <p className="text-gray-700 leading-relaxed">
          Invoice follow-up is the scheduled set of reminders you send when a client has not paid by the due
          date — usually a short, escalating sequence from a friendly heads-up to a final notice. It matters
          because late payment is normal, not exceptional: studies of freelancer and SMB cash flow consistently
          find{' '}
          <Link to="/blog/late-payment-statistics-2026" className="font-medium text-blue-600 hover:text-blue-700">
            around half of invoices arrive after their due date
          </Link>
          , and the invoices that get paid fastest are the ones politely reminded <em>before</em> or on the due date.
        </p>
        <p className="text-gray-700 leading-relaxed">
          The goal is not to pressure people — it is to be organised, consistent and pleasant so payment is
          effortless. That consistency is exactly what humans are bad at and automation is good at.
        </p>
      </section>

      <section id="reminder-ladder" className="mt-14 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">The invoice follow-up ladder that works</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Escalate directness, not emotion. Each step adds a little more urgency while staying professional. For the
          full day-by-day version with wording, see the{' '}
          <Link to="/how-to-follow-up-on-overdue-invoices" className="font-medium text-blue-600 hover:text-blue-700">
            overdue invoice follow-up guide
          </Link>
          .
        </p>
        <ol className="space-y-5">
          {LADDER.map((item) => (
            <li key={item.stage} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.stage}</span>
              </div>
              <p className="mt-2 text-gray-600 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="email-templates" className="mt-14 space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900">Follow-up email templates</h2>
        <p className="text-gray-700 leading-relaxed">
          The most effective follow-up emails are short, name the concrete facts (invoice number, amount, due
          date), include the payment link, and offer an easy out. We keep five copy-paste templates — warm,
          friendly, professional, firm and urgent — in our{' '}
          <Link to="/invoice-follow-up-email-templates-for-freelancers" className="font-medium text-blue-600 hover:text-blue-700">
            freelancer invoice email templates
          </Link>{' '}
          library. GentleTap drafts the same five tones automatically for each real invoice and client history, so
          you rarely need to write one by hand.
        </p>
      </section>

      <section id="automate-quickbooks" className="mt-14 space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900">How do I automate invoice reminders in QuickBooks?</h2>
        <p className="text-gray-700 leading-relaxed">
          Built-in QuickBooks reminders use generic, QuickBooks-branded wording. To send reminders that sound like
          you and stop themselves when paid, connect QuickBooks to a follow-up layer. Here is the five-step setup
          for GentleTap (the same pattern applies to FreshBooks):
        </p>
        <ol className="space-y-3 mt-4">
          {AUTOMATE_STEPS.map((step, i) => (
            <li key={step.name} className="flex gap-3 bg-white rounded-xl border border-gray-200 px-5 py-4">
              <span className="flex-none w-7 h-7 rounded-full bg-blue-600 text-white text-sm font-semibold flex items-center justify-center">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{step.name}</h3>
                <p className="mt-0.5 text-gray-600 text-sm leading-relaxed">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-gray-600">
          Deeper walkthroughs:{' '}
          <Link to="/quickbooks-invoice-automation" className="font-medium text-blue-600 hover:text-blue-700">
            QuickBooks invoice automation
          </Link>
          ,{' '}
          <Link to="/features/send-from-gmail" className="font-medium text-blue-600 hover:text-blue-700">
            sending from Gmail
          </Link>
          , and{' '}
          <Link to="/quickbooks-reminders-vs-gentletap" className="font-medium text-blue-600 hover:text-blue-700">
            QuickBooks reminders vs GentleTap
          </Link>
          .
        </p>
      </section>

      <section id="manual-vs-automated" className="mt-14 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Manual vs automated invoice follow-up</h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-white text-gray-900">
              <tr>
                <th className="px-4 py-3 font-semibold">What matters</th>
                <th className="px-4 py-3 font-semibold">Manual</th>
                <th className="px-4 py-3 font-semibold text-blue-700">Automated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-slate-50">
              {COMPARISON.map((row) => (
                <tr key={row.dimension}>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.dimension}</td>
                  <td className="px-4 py-3 text-gray-600">{row.manual}</td>
                  <td className="px-4 py-3 text-gray-800">{row.automated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Manual works for two or three invoices. Past that, consistency — not effort — is what decides whether
          you get paid, and that is the part people are worst at.
        </p>
      </section>

      <section id="whatsapp" className="mt-14 space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900">Should I also send WhatsApp reminders?</h2>
        <p className="text-gray-700 leading-relaxed">
          For some clients a WhatsApp nudge lands where email gets ignored. GentleTap keeps email first (from your
          Gmail) and adds a short WhatsApp follow-up about three hours later on the early steps, so you are never
          spamming on two channels at once. See{' '}
          <Link to="/features/whatsapp-reminders" className="font-medium text-blue-600 hover:text-blue-700">
            WhatsApp invoice reminders
          </Link>{' '}
          for how it works and which plans include it.
        </p>
      </section>

      <section id="tools" className="mt-14 space-y-4 scroll-mt-20">
        <h2 className="text-2xl font-bold text-gray-900">Choosing invoice reminder software</h2>
        <p className="text-gray-700 leading-relaxed">
          The market ranges from freelancer-first tools to full credit-control platforms. We keep honest,
          feature-by-feature comparisons rather than recycled listicles:
        </p>
        <ul className="space-y-2 mt-3">
          <li>
            <Link to="/compare" className="font-medium text-blue-600 hover:text-blue-700">All GentleTap comparisons</Link>{' '}
            — vs{' '}
            <Link to="/compare/chasivo" className="font-medium text-blue-600 hover:text-blue-700">Chasivo</Link>,{' '}
            <Link to="/compare/bonsai" className="font-medium text-blue-600 hover:text-blue-700">Bonsai</Link>,{' '}
            <Link to="/compare/chaser" className="font-medium text-blue-600 hover:text-blue-700">Chaser</Link> and more.
          </li>
          <li>
            <Link to="/alternatives" className="font-medium text-blue-600 hover:text-blue-700">Invoice chasing alternatives</Link>{' '}
            if you are still deciding what kind of tool fits.
          </li>
        </ul>
        <p className="text-gray-700 leading-relaxed">
          Fitting your specific workflow? Follow-ups for{' '}
          <Link to="/industries/freelancers" className="font-medium text-blue-600 hover:text-blue-700">freelancers</Link>,{' '}
          <Link to="/industries/consultants" className="font-medium text-blue-600 hover:text-blue-700">consultants</Link> and{' '}
          <Link to="/industries/agencies" className="font-medium text-blue-600 hover:text-blue-700">agencies</Link>{' '}
          each have their own guide.
        </p>
      </section>

      <section id="faq" className="mt-14 scroll-mt-20">
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
        <h2 className="text-xl font-bold mb-2">Stop writing the follow-up you keep putting off</h2>
        <p className="mx-auto max-w-lg text-blue-100 mb-5">
          Connect QuickBooks, preview AI drafts for your real invoices, and let the sequence run — free for up to 5 invoices.
        </p>
        <Link to="/signup" className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
          Start free — no credit card
        </Link>
      </section>
    </article>
  </MarketingShell>
);
