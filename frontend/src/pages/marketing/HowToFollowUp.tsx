import React from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell, Breadcrumbs } from '../../components/marketing/MarketingShell';
import {
  GENTLETAP_DEFINITION,
  HOW_TO_FOLLOW_UP_STEPS,
  OVERDUE_FOLLOW_UP_FAQ,
  OVERDUE_FOLLOW_UP_PRINCIPLES,
  OVERDUE_FOLLOW_UP_TIMELINE,
} from '../../data/seo-content';
import { SEO_KEYWORD_CLUSTERS, breadcrumbJsonLd, faqJsonLd, howToJsonLd, webPageJsonLd } from '../../data/seo';

const PATH = '/how-to-follow-up-on-overdue-invoices';
const PAGE_TITLE = 'How to follow up on overdue invoices without being annoying';
const PAGE_DESCRIPTION =
  'Practical timeline and principles for freelancers chasing late payments — from due-date reminders through day 30, without damaging client relationships.';

export const HowToFollowUp: React.FC = () => (
  <MarketingShell>
    <Seo
      title="How to Follow Up on Overdue Invoices (Without Being Annoying)"
      description="A freelancer's guide to following up on overdue invoices — day-by-day timeline, tone tips, and when to escalate. Copy email templates or automate with GentleTap + QuickBooks."
      path={PATH}
      keywords={[...SEO_KEYWORD_CLUSTERS.howTo, ...SEO_KEYWORD_CLUSTERS.templates.slice(0, 3)]}
      jsonLd={[
        webPageJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, PATH),
        breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Overdue invoice follow-up guide', path: PATH },
        ]),
        howToJsonLd(PAGE_TITLE, PAGE_DESCRIPTION, HOW_TO_FOLLOW_UP_STEPS),
        faqJsonLd(OVERDUE_FOLLOW_UP_FAQ),
      ]}
    />
    <article className="max-w-3xl mx-auto px-6 py-14">
      <Breadcrumbs items={[{ name: 'Home', path: '/' }, { name: 'Overdue invoice follow-up guide' }]} />
      <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">Freelancer guide · QuickBooks &amp; Gmail</p>
      <h1 className="mt-3 text-4xl font-extrabold text-gray-900 leading-tight">{PAGE_TITLE}</h1>
      <p className="mt-5 text-lg text-gray-600 leading-relaxed">
        You finished the work. You sent the invoice. Now it's a week past due and you're staring at a
        blank email — worried you'll sound pushy, but you also can't keep floating the cost. This guide is
        the day-by-day follow-up sequence freelancers use to get paid while keeping the relationship intact.
      </p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/signup" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors">
          Automate follow-ups free
        </Link>
        <Link to="/invoice-follow-up-email-templates-for-freelancers" className="border border-gray-300 hover:border-blue-400 text-gray-700 font-medium px-5 py-2.5 rounded-lg transition-colors">
          Copy email templates
        </Link>
      </div>

      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Why overdue invoice follow-ups feel awkward</h2>
        <p className="text-gray-700 leading-relaxed">
          Freelancers delay follow-ups for the same reason clients delay payment: the task is emotionally
          loaded. You're not a collections department — you're someone who wants repeat work from this
          client. The fix isn't avoiding the email; it's using a{' '}
          <strong className="font-semibold text-gray-900">consistent, professional script</strong> that
          escalates tone gradually instead of repeating the same anxious nudge.
        </p>
        <p className="text-gray-700 leading-relaxed">
          If you use QuickBooks Online, include the payment link every time. If you invoice manually, paste
          your Stripe or bank link — friction kills payment speed.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Day-by-day overdue invoice timeline</h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          Adjust timing for long-term clients (add a day) or large invoices (start earlier). Keep one email thread per invoice.
        </p>
        <ol className="space-y-5">
          {OVERDUE_FOLLOW_UP_TIMELINE.map((item) => (
            <li key={item.day} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">{item.day}</span>
              </div>
              <p className="mt-2 text-gray-600 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-sm text-gray-500">
          Need exact wording?{' '}
          <Link to="/invoice-follow-up-email-templates-for-freelancers" className="font-medium text-blue-600 hover:text-blue-700">
            Copy our 5 freelancer email templates &rarr;
          </Link>
        </p>
      </section>

      <section className="mt-14 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Four principles that keep follow-ups professional</h2>
        <div className="space-y-4 mt-4">
          {OVERDUE_FOLLOW_UP_PRINCIPLES.map((item) => (
            <div key={item.title} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <h3 className="font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-1.5 text-gray-600 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 bg-slate-100 border border-gray-200 rounded-2xl px-6 py-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Automate this sequence instead of copy-pasting</h2>
        <p className="text-gray-600 leading-relaxed">{GENTLETAP_DEFINITION}</p>
        <Link to="/quickbooks-reminders-vs-gentletap" className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
          See how GentleTap compares to QuickBooks reminders and other tools &rarr;
        </Link>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Common questions</h2>
        <dl className="space-y-5">
          {OVERDUE_FOLLOW_UP_FAQ.map((item) => (
            <div key={item.q} className="bg-white rounded-2xl border border-gray-200 p-6">
              <dt className="font-semibold text-gray-900">{item.q}</dt>
              <dd className="mt-2 text-gray-600 leading-relaxed">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-14 bg-blue-600 rounded-2xl p-8 text-center text-white">
        <h2 className="text-xl font-bold mb-2">Send the follow-up you keep putting off</h2>
        <p className="mx-auto max-w-lg text-blue-100 mb-5">
          Connect QuickBooks, preview AI drafts for your real invoices, and turn on autopilot — free for up to 5 invoices.
        </p>
        <Link to="/signup" className="inline-block bg-white text-blue-700 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors">
          Start free — no credit card
        </Link>
      </section>
    </article>
  </MarketingShell>
);
