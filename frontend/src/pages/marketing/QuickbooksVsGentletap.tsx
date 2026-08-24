import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import { COMPETITOR_COMPARISON } from '../../data/seo-content';
import { DEFAULT_DESCRIPTION, faqJsonLd, webPageJsonLd } from '../../data/seo';

const COMPARISON = [
  { feature: 'Personalized AI drafts per client', qbo: 'Generic templates only', gentletap: 'Yes — per invoice & client history' },
  { feature: 'Send from your Gmail inbox', qbo: 'QuickBooks-branded emails', gentletap: 'Yes — your name & address' },
  { feature: 'Multi-step escalation sequences', qbo: 'Basic scheduled reminders', gentletap: 'Yes — warm to firm follow-ups' },
  { feature: 'Stops when invoice paid in QBO', qbo: 'Yes', gentletap: 'Yes — syncs balance automatically' },
  { feature: 'WhatsApp follow-ups', qbo: 'No', gentletap: 'Yes — on Pro+ & Team' },
  { feature: 'Preview before first send', qbo: 'Limited', gentletap: 'Yes — approve every draft' },
  { feature: 'Starting price', qbo: 'Included with QBO subscription', gentletap: 'Free Starter · Pro from $19/mo' },
] as const;

const VS_FAQ = [
  {
    q: 'Can I use GentleTap with QuickBooks Online?',
    a: 'Yes. GentleTap connects to QuickBooks Online with read-only access, imports unpaid invoices, and stops reminders when balances hit zero.',
  },
  {
    q: 'Do I still need QuickBooks if I use GentleTap?',
    a: 'Yes. GentleTap complements QuickBooks — it does not replace invoicing or accounting. You keep creating invoices in QBO; GentleTap handles polite follow-up.',
  },
  {
    q: 'Why not just use QuickBooks payment reminders?',
    a: 'QuickBooks reminders work for basic nudges. GentleTap adds AI-personalized copy, sends from your Gmail, escalates over time, and is built for freelancers who want to protect client relationships while getting paid.',
  },
  {
    q: 'How much does GentleTap cost compared to QuickBooks?',
    a: 'QuickBooks reminders are included in your QBO plan. GentleTap has a free Starter tier (5 collections/month) and paid plans from $19/month for unlimited automated follow-ups.',
  },
];

export const QuickbooksVsGentletap: React.FC = () => (
  <MarketingShell>
    <Seo
      title="QuickBooks Reminders vs GentleTap — AI Invoice Follow Up"
      description="Compare QuickBooks Online built-in payment reminders vs GentleTap. Automate QuickBooks invoice follow-ups with AI, Gmail sending, and automatic stop-on-payment. Free Starter plan."
      path="/quickbooks-reminders-vs-gentletap"
      keywords={[
        'QuickBooks reminders vs GentleTap',
        'QuickBooks payment reminders alternative',
        'automate QuickBooks invoice follow ups',
        'AI accounts receivable for QuickBooks',
        'QuickBooks Online reminder limitations',
      ]}
      jsonLd={[
        webPageJsonLd('QuickBooks reminders vs GentleTap', DEFAULT_DESCRIPTION, '/quickbooks-reminders-vs-gentletap'),
        faqJsonLd(VS_FAQ),
      ]}
    />
    <article className="max-w-4xl mx-auto px-6 py-14">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'QuickBooks vs GentleTap' }]} />
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">QuickBooks Online · Comparison</p>
      <h1 className="mt-3 text-4xl font-extrabold text-gray-900 leading-tight">QuickBooks payment reminders vs GentleTap</h1>
      <p className="mt-5 text-lg text-gray-600 leading-relaxed max-w-2xl">
        QuickBooks Online can send invoice reminders — but freelancers often need more than generic
        templates. GentleTap automates QuickBooks invoice follow-ups with AI drafts, Gmail delivery, and
        sequences that stop when clients pay.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
          Try GentleTap free
        </Link>
        <Link to="/quickbooks-payment-reminders" className="border border-gray-300 hover:border-blue-400 text-gray-700 font-medium px-5 py-2.5 rounded-lg transition-colors">
          How QBO reminders work
        </Link>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-gray-900">Automate QuickBooks invoice follow-ups</h2>
        <p className="mt-4 text-gray-700 leading-relaxed">
          Built-in QuickBooks reminders are a starting point. GentleTap is{' '}
          <strong className="font-semibold text-gray-900">AI accounts receivable for QuickBooks</strong> —
          designed for agencies and independents who invoice through QBO but want follow-ups that sound
          human and send from their own inbox.
        </p>
      </section>

      <section className="mt-14 overflow-x-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">GentleTap vs other invoice reminder tools</h2>
        <p className="max-w-2xl text-gray-600 leading-relaxed">
          QuickBooks is the most common comparison — but freelancers also evaluate Bonsai, Chaser, Melio,
          Paidnice, Landolio, and more.{' '}
          <Link to="/compare" className="text-blue-600 hover:text-blue-700 font-medium">
            See all honest comparisons &rarr;
          </Link>
        </p>
        <table className="mt-6 w-full min-w-[640px] border-collapse text-left text-sm bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 font-semibold">Alternative</th>
              <th className="px-5 py-3 font-semibold">Typical limitation</th>
              <th className="px-5 py-3 font-semibold text-blue-600">GentleTap</th>
            </tr>
          </thead>
          <tbody>
            {COMPETITOR_COMPARISON.map((row) => (
              <tr key={row.alternative} className="border-t border-gray-100">
                <td className="px-5 py-3 font-medium text-gray-800">{row.alternative}</td>
                <td className="px-5 py-3 text-gray-500">{row.theirLimitation}</td>
                <td className="px-5 py-3 text-gray-700">{row.gentletapAdvantage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-12 overflow-x-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">QuickBooks Online vs GentleTap (feature by feature)</h2>
        <table className="w-full min-w-[560px] border-collapse text-left text-sm bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wide text-gray-500">
              <th className="px-5 py-3 font-semibold">Feature</th>
              <th className="px-5 py-3 font-semibold">QuickBooks Online</th>
              <th className="px-5 py-3 font-semibold text-blue-600">GentleTap</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map((row) => (
              <tr key={row.feature} className="border-t border-gray-100">
                <td className="px-5 py-3 font-medium text-gray-800">{row.feature}</td>
                <td className="px-5 py-3 text-gray-500">{row.qbo}</td>
                <td className="px-5 py-3 text-gray-700">{row.gentletap}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-14 grid gap-5 sm:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900">When QuickBooks reminders are enough</h2>
          <p className="mt-2 text-gray-600 leading-relaxed">
            You send a few invoices a month, clients usually pay on time, and a simple scheduled nudge from QuickBooks is all you need.
          </p>
        </div>
        <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
          <h2 className="text-lg font-semibold text-blue-900">When GentleTap helps most</h2>
          <p className="mt-2 text-blue-800/80 leading-relaxed">
            You chase multiple overdue invoices, want AI-personalized copy, need Gmail sending, or run escalating sequences until payment lands — without writing every email yourself.
          </p>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">FAQ</h2>
        <dl className="space-y-5">
          {VS_FAQ.map((item) => (
            <div key={item.q} className="bg-white rounded-2xl border border-gray-200 p-6">
              <dt className="font-semibold text-gray-900">{item.q}</dt>
              <dd className="mt-2 text-gray-600 leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 bg-blue-600 rounded-2xl p-8 text-center text-white">
        <h2 className="text-xl font-bold mb-2">Automate QuickBooks payment reminders — try free</h2>
        <p className="mx-auto max-w-lg text-blue-100 mb-5">
          Connect QuickBooks Online, preview AI follow-ups, and turn on autopilot in under five minutes. Starter plan is free — no credit card.
        </p>
        <Link to="/signup" className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
          Start free
        </Link>
      </section>
    </article>
  </MarketingShell>
);
