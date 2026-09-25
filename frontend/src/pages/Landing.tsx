import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { MarketingShell } from '@/components/marketing/MarketingShell';
import { Seo } from '@/components/marketing/Seo';
import { faqJsonLd, websiteJsonLd, SEO_KEYWORDS } from '@/data/seo';

const PAGE_DESCRIPTION =
  'GentleTap chases your overdue invoices on autopilot — AI drafts reminders in your voice, sends from your Gmail, syncs QuickBooks and FreshBooks, and stops the moment you’re paid.';

const FEATURES = [
  {
    eyebrow: 'Hands off',
    title: 'Runs on autopilot',
    body: 'Pick the cadence once. GentleTap follows up on every overdue invoice at the right time and tone — syncing, drafting, and sending without you touching it.',
  },
  {
    eyebrow: 'Sounds like you',
    title: 'AI drafts in your voice',
    body: 'Each reminder is written for the client, amount, and how overdue it is — warm first, firmer later. Preview anything before it sends.',
  },
  {
    eyebrow: 'Your inbox',
    title: 'Sends from your Gmail',
    body: 'Clients see your name, not a noreply@ domain. Replies land in your inbox where they belong.',
  },
  {
    eyebrow: 'Accounting sync',
    title: 'QuickBooks + FreshBooks',
    body: 'Unpaid invoices sync automatically every 30 minutes. Or upload a spreadsheet / add one manually — same autopilot.',
  },
  {
    eyebrow: 'Stops on a dime',
    title: 'Pauses the moment you’re paid',
    body: 'When the balance hits zero in your accounting tool — or you mark it paid — the sequence stops instantly. No awkward “already paid” chase.',
  },
  {
    eyebrow: 'Multi-channel',
    title: 'Email + WhatsApp nudges',
    body: 'On Pro+ and Team: email first, then a short WhatsApp follow-up a few hours later for clients who miss the inbox.',
  },
  {
    eyebrow: 'Smarter per client',
    title: 'AI client payment profiles',
    body: 'Average days to pay, late rate, and risk level shape tone and timing — reliable clients get warmth, chronic late payers get clearer asks.',
  },
  {
    eyebrow: 'You own the rules',
    title: 'Cadence & send windows',
    body: 'Edit day offsets, tones, quiet hours, weekends, minimum amounts, and pause-all from one control center.',
  },
  {
    eyebrow: 'Know when to step in',
    title: 'Escalation rules & alerts',
    body: 'Flag invoices by days overdue, balance, or reminder step. Get alerts — or hand a client off for a personal touch.',
  },
] as const;

const STEPS = [
  {
    title: 'Connect accounting + Gmail',
    body: 'Link QuickBooks Online or FreshBooks (or upload a CSV / add an invoice). Authorize Gmail in about two minutes.',
  },
  {
    title: 'Preview AI drafts',
    body: 'GentleTap drafts reminders for your real overdue invoices. Adjust the cadence or tone before anything goes out.',
  },
  {
    title: 'Turn on autopilot',
    body: 'Sequences run on your cadence — syncing, drafting, sending. They stop when paid and respect your pause and quiet hours.',
  },
] as const;

const PAIN = [
  {
    title: 'Follow-ups slip',
    body: 'You’re delivering work — chasing invoices slips to next week, then the week after.',
  },
  {
    title: '“Just checking in” feels awkward',
    body: 'Writing the email is harder than the work that earned the invoice.',
  },
  {
    title: 'Reminders stay inconsistent',
    body: 'Some clients get chased; others slip through — and you never know which.',
  },
] as const;

const LANDING_FAQ = [
  {
    q: 'How does GentleTap chase my invoices?',
    a: 'Turn on autopilot and GentleTap syncs your unpaid invoices from QuickBooks or FreshBooks every 30 minutes, drafts a reminder in your voice, and sends it from your Gmail at the right moment. It escalates tone on your cadence and re-checks for payment before every send.',
  },
  {
    q: 'Is GentleTap a debt collection agency?',
    a: 'No. GentleTap is invoice follow-up software you control — reminders from your Gmail in your voice. It does not buy debt, threaten clients, or act as a third-party collector.',
  },
  {
    q: 'Do reminders really stop when an invoice is paid?',
    a: 'Yes. Before every scheduled send, GentleTap re-checks the invoice balance in your accounting tool. If it’s paid — or you marked it paid — the rest of the sequence is cancelled automatically.',
  },
  {
    q: 'Will clients know software sent it?',
    a: 'No. Reminders come from your own Gmail with your name and signature. Each one is written for that specific client, invoice, and stage — not a mail-merge blast.',
  },
  {
    q: 'Can I review messages before they send?',
    a: 'Yes. Fully hands-off is the default, but you can flip on approval for the first batch, for high amounts, or for any single invoice — then review everything in one inbox.',
  },
  {
    q: 'Can I pause one invoice or everything?',
    a: 'Both. Pause a single invoice anytime, or use Pause all with an optional resume date — useful for holidays or when a client says “check is in the mail”.',
  },
  {
    q: 'Does it send WhatsApp messages?',
    a: 'On Pro+ ($39/mo) and Team: email sends first, then a short WhatsApp nudge for clients who miss the inbox. Starter and Pro are email-only.',
  },
  {
    q: 'Is there a free plan?',
    a: 'Yes — free forever for up to 5 collections a month. No credit card required. Upgrade when you need unlimited collections, WhatsApp, or team seats.',
  },
] as const;

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    '5 collections / month',
    '1 seat',
    'Email reminders from your Gmail',
    'QuickBooks + FreshBooks sync',
    'AI drafts in your voice',
    'Pause & quiet hours',
  ],
  pro: [
    'Unlimited collections',
    '1 seat',
    'Everything in Starter',
    'Client payment profiles',
    'Escalation rules & alerts',
    'Priority AI drafting',
  ],
  pro_plus: [
    'Everything in Pro',
    '450 WhatsApp reminders / mo',
    'WhatsApp quiet hours & timing',
    'Advanced analytics',
  ],
  team: [
    'Everything in Pro+',
    '850 WhatsApp reminders / mo',
    '3 seats included',
    'Roles & audit log',
  ],
};

const SEQUENCE_PREVIEW = [
  { day: 0, tone: 'Warm nudge', note: 'Sent from your Gmail, in your voice' },
  { day: 3, tone: 'Friendly check-in', note: 'Mentions the balance gently' },
  { day: 7, tone: 'Professional follow-up', note: 'Clear ask, still polite' },
  { day: 14, tone: 'Firm reminder', note: 'Sets a payment date' },
  { day: 21, tone: 'Final notice', note: 'Last step before you step in' },
];

/* -------------------------------------------------------------- pricing */

interface PublicPlan {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  collections: number | 'unlimited';
  whatsapp: number;
  seats: number;
}

const PricingSection: React.FC = () => {
  const [annual, setAnnual] = useState(false);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['publicPlans'],
    queryFn: async () => (await api.get('/public/plans')).data,
    staleTime: Infinity,
  });

  const plans: PublicPlan[] = data?.plans || [];
  const highlighted = plans.find((p) => p.id === 'pro');

  return (
    <section id="pricing" className="scroll-mt-20 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-center text-sm font-medium uppercase tracking-widest text-brand-600">Pricing</p>
        <h2 className="mt-3 text-center text-2xl font-bold sm:text-3xl">No surprises. No pressure.</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-600">
          Start free. Upgrade when you need more. Cancel anytime.
        </p>

        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                !annual ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                annual ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Annual <span className="text-xs opacity-80">· 2 months free</span>
            </button>
          </div>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {isPending &&
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                aria-hidden
                className="flex animate-pulse flex-col rounded-2xl border border-slate-200 bg-white p-6"
              >
                <div className="h-5 w-24 rounded bg-slate-100" />
                <div className="mt-4 h-9 w-20 rounded bg-slate-100" />
                <div className="mt-6 space-y-2.5">
                  {[0, 1, 2, 3].map((n) => (
                    <div key={n} className="h-3 rounded bg-slate-100" style={{ width: `${88 - n * 12}%` }} />
                  ))}
                </div>
                <div className="mt-8 h-9 rounded-full bg-slate-100" />
              </div>
            ))}
          {!isPending && isError && (
            <div className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm font-medium text-slate-900">Couldn't load pricing right now.</p>
              <p className="mt-1 text-xs text-slate-600">It never hurts to just start free — no card required.</p>
              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => refetch()}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                >
                  Retry
                </button>
                <Link
                  to="/signup"
                  className="rounded-full bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                >
                  Start free
                </Link>
              </div>
            </div>
          )}
          {plans.map((plan) => {
            const price = annual ? plan.annual : plan.monthly;
            const features = PLAN_FEATURES[plan.id] || [];
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-6 ${
                  plan.id === highlighted?.id
                    ? 'border-brand-600 ring-1 ring-brand-600 bg-white shadow-md'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                  {plan.id === highlighted?.id && (
                    <span className="rounded-full bg-brand-600/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-600">
                      Most popular
                    </span>
                  )}
                </div>
                <div className="mt-3 mb-4">
                  <span className="text-4xl font-bold text-slate-900">${price}</span>
                  <span className="text-sm text-slate-600">/{annual ? 'mo billed yearly' : 'mo'}</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-600 flex-1">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-brand-300" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                    plan.id === highlighted?.id
                      ? 'bg-brand-600 text-white hover:bg-brand-700'
                      : 'border border-slate-200 text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {plan.monthly === 0 ? 'Start free' : 'Get started'}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">
          Prices in USD. Need more than 3 seats or WhatsApp credits?{' '}
          <Link to="/affiliates" className="text-brand-600 font-medium hover:underline">
            Join the partner program
          </Link>{' '}
          or contact us.
        </p>
      </div>
    </section>
  );
};

/* ---------------------------------------------------------------- page */

export const Landing: React.FC = () => {
  return (
    <MarketingShell>
      <Seo
        title="GentleTap — Automated Invoice Reminders on Autopilot"
        description={PAGE_DESCRIPTION}
        path="/"
        keywords={SEO_KEYWORDS}
        jsonLd={[websiteJsonLd(), faqJsonLd(LANDING_FAQ)]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.12),transparent_60%)]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-brand-600">
              Accounts receivable, finally quiet
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
              Stop chasing.
              <br />
              <span className="text-brand-600">Start getting paid.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              GentleTap chases every overdue invoice on autopilot — AI drafts reminders in your
              voice, sends them from your Gmail, syncs QuickBooks and FreshBooks, and stops the
              moment you’re paid.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/signup" className="btn-mkt-primary min-w-[200px] text-center">
                Get started free
              </Link>
              <a href="#how-it-works" className="btn-mkt-secondary min-w-[200px] text-center">
                See how it works →
              </a>
            </div>
            <p className="mt-4 text-sm text-slate-600">
              Free up to 5 collections/month · No credit card required
            </p>
          </div>

          {/* Autopilot sequence preview */}
          <div className="mkt-card">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Autopilot</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-900">INV-1042 · $2,450 · 9 days overdue</p>
              </div>
              <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                Running
              </span>
            </div>
            <ol className="mt-4 space-y-3">
              {SEQUENCE_PREVIEW.map((step, i) => (
                <li key={step.day} className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-7 w-11 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      i < 3
                        ? 'bg-brand-600 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    Day {step.day}
                  </span>
                  <div>
                    <p className={`text-sm font-semibold ${i < 3 ? 'text-slate-900' : 'text-slate-600'}`}>
                      {step.tone}
                    </p>
                    <p className="text-xs text-slate-600">{step.note}</p>
                  </div>
                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    {i < 2 ? 'Sent' : i === 2 ? 'Sending…' : 'Scheduled'}
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 rounded-xl bg-emerald-600/10 px-3 py-2 text-xs font-medium text-emerald-600">
              Invoice paid? The whole sequence stops — automatically, before the next send.
            </p>
          </div>
        </div>
      </section>

      {/* Pain */}
      <section className="border-b border-slate-200 bg-slate-100/60 py-14">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Chasing invoices shouldn’t feel like a second job
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {PAIN.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="product" className="scroll-mt-20 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-brand-600">
            Why GentleTap
          </p>
          <h2 className="mt-3 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Everything you need to collect — without sounding pushy
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            From autopilot drafts and Gmail to WhatsApp, cadence control, escalation rules, and
            client payment profiles — you own every feature.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{f.eyebrow}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200 bg-slate-100/60 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm font-medium uppercase tracking-widest text-brand-600">
            The flow
          </p>
          <h2 className="mt-3 text-center text-2xl font-bold text-slate-900 sm:text-3xl">
            Three steps from overdue to paid
          </h2>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((item, i) => (
              <div key={item.title}>
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/signup" className="btn-mkt-primary inline-flex">
              Start getting paid →
            </Link>
          </div>
        </div>
      </section>

      {/* Integrations strip */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Works with how you already invoice</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              'QuickBooks Online',
              'FreshBooks',
              'CSV / spreadsheet',
              'Manual invoice',
              'Gmail',
              'WhatsApp',
            ].map((name) => (
              <span
                key={name}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-y border-slate-200 bg-slate-900 py-16 text-slate-50">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <blockquote className="text-xl leading-relaxed sm:text-2xl">
            &ldquo;I used to rewrite the same ‘just checking in’ email for a week. GentleTap sent
            something I’d actually send — on day five, not day twenty.&rdquo;
          </blockquote>
          <p className="mt-5 text-sm text-slate-50/60">— Beta user, independent consultant</p>
        </div>
      </section>

      <PricingSection />

      {/* FAQ */}
      <section className="border-t border-slate-200 bg-slate-100/60 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">Questions, answered</h2>
          <dl className="mt-10 space-y-6">
            {LANDING_FAQ.map((item) => (
              <div key={item.q} className="border-b border-slate-200 pb-6">
                <dt className="font-semibold text-slate-900">{item.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Ready to stop chasing?
          </h2>
          <p className="mt-4 text-slate-600">
            Set up in minutes. First five collections free. No credit card needed.
          </p>
          <Link to="/signup" className="btn-mkt-primary mt-8 inline-flex min-w-[220px]">
            Start getting paid →
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
};
