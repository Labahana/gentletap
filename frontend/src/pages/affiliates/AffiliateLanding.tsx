import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, DollarSign, Link2, Percent, Sparkles, Users } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell } from '../../components/marketing/MarketingShell';
import { api, apiErrorMessage } from '../../lib/api';
import { AFFILIATE_FAQ } from '../../data/seo-content';
import { affiliateProgramJsonLd, breadcrumbJsonLd, faqJsonLd } from '../../data/seo';

type FounderTier = {
  rate: number;
  months: number;
  limit: number;
  slots_remaining: number;
};

type ProgramInfo = {
  commission_rate: number;
  first_month_rate: number;
  commission_months: number;
  cookie_days: number;
  payout_minimum: number;
  referral_discount_percent: number;
  referral_discount_months: number;
  founder_tier: FounderTier;
  performance_tiers: Array<{ monthly_referred_revenue: number; rate: number }>;
  description: string;
  audience_offer: string | null;
};

type Plan = {
  id: string;
  name: string;
  monthly: number;
  annual: number;
  collections: number | string;
};

const ApplyForm: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    channel_name: '',
    channel_url: '',
    partner_type: 'creator' as 'creator' | 'accountant' | 'other',
    application_note: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/affiliates/apply', {
        ...form,
        channel_name: form.channel_name || null,
        channel_url: form.channel_url || null,
        application_note: form.application_note || null,
      });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to submit application'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-8 text-center">
        <CheckCircle2 size={40} className="text-blue-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-900 mb-1.5">Application received</h3>
        <p className="text-gray-600">We'll review it and email you when your account is approved.</p>
        <Link to="/affiliates/login" className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium">
          Affiliate login &rarr;
        </Link>
      </div>
    );
  }

  return (
    <form id="apply" onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 space-y-4 scroll-mt-24">
      <h3 className="text-xl font-bold text-gray-900">Apply now</h3>
      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <input required value={form.name} onChange={set('name')} placeholder="Your name" className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <select value={form.partner_type} onChange={set('partner_type')} className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="creator">Content creator</option>
          <option value="accountant">Accountant / bookkeeper</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <input required type="email" value={form.email} onChange={set('email')} placeholder="Email" className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input required type="password" minLength={8} value={form.password} onChange={set('password')} placeholder="Password (min 8 chars)" className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <input value={form.channel_name} onChange={set('channel_name')} placeholder="Channel / site name" className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={form.channel_url} onChange={set('channel_url')} placeholder="https://youtube.com/@you" className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      <textarea value={form.application_note} onChange={set('application_note')} rows={3} placeholder="Tell us about your audience (optional)" className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {loading ? 'Submitting…' : 'Submit application'}
      </button>
      <p className="text-xs text-gray-500">
        Already approved?{' '}
        <Link to="/affiliates/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Log in to your dashboard
        </Link>
      </p>
    </form>
  );
};

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export const AffiliateLanding: React.FC = () => {
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);

  useEffect(() => {
    api.get('/affiliates/program').then((r) => setProgram(r.data)).catch(() => undefined);
    api.get('/public/plans').then((r) => setPlans(r.data.plans || [])).catch(() => undefined);
  }, []);

  const firstMonthPct = program ? Math.round(program.first_month_rate * 100) : 50;
  const basePct = program ? Math.round(program.commission_rate * 100) : 30;
  const months = program?.commission_months ?? 24;
  const founder = program?.founder_tier ?? { rate: 0.4, months: 6, limit: 25, slots_remaining: 25 };
  const founderPct = Math.round(founder.rate * 100);
  const slotsOpen = founder.slots_remaining > 0;
  const tiers = program?.performance_tiers ?? [
    { monthly_referred_revenue: 0, rate: 0.3 },
    { monthly_referred_revenue: 500, rate: 0.35 },
    { monthly_referred_revenue: 2000, rate: 0.4 },
  ];
  const paidPlans = plans.filter((p) => p.monthly > 0);

  return (
    <MarketingShell>
      <Seo
        title={`GentleTap Affiliate Program — ${firstMonthPct}% First Month + ${basePct}% Recurring for ${months} Months`}
        description={`Earn ${firstMonthPct}% of each referral's first month plus ${basePct}% recurring for ${months} months promoting GentleTap. Founding partners get ${founderPct}% for ${founder.months} months. Free to join, monthly payouts.`}
        path="/affiliates"
        jsonLd={[
          affiliateProgramJsonLd({
            firstMonthRate: firstMonthPct / 100,
            baseRate: basePct / 100,
            commissionMonths: months,
            founderRate: founder.rate,
            founderMonths: founder.months,
            founderLimit: founder.limit,
          }),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Affiliates', path: '/affiliates' },
          ]),
          faqJsonLd(AFFILIATE_FAQ),
        ]}
      />
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">Affiliate program</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            Earn {firstMonthPct}% of the first month —
            <br />
            <span className="text-blue-600">plus {basePct}% recurring for {months} months.</span>
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {program?.description ||
              `Earn ${firstMonthPct}% of each referral's first month plus ${basePct}% of every subscription payment for ${months} months per referred customer.`}
          </p>

          {/* Founding partner banner */}
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-blue-600" />
              <p className="font-bold text-gray-900">
                Founding partner offer {slotsOpen ? `— ${founder.slots_remaining} of ${founder.limit} slots left` : '— filled'}
              </p>
            </div>
            <p className="mt-1 text-sm text-gray-700">
              The first {founder.limit} approved partners earn <strong>{founderPct}% recurring</strong> (instead of {basePct}%)
              for their first {founder.months} months — automatically applied when you're approved.
            </p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.max(4, ((founder.limit - founder.slots_remaining) / founder.limit) * 100)}%` }}
              />
            </div>
          </div>

          <ul className="space-y-3 mb-8">
            {[
              `${firstMonthPct}% first-month bounty + ${basePct}% recurring for ${months} months`,
              `Founding partners: ${founderPct}% recurring for ${founder.months} months`,
              'Automatic performance tiers up to 40% renewal rate',
              'Monthly payouts — PayPal, Wise, or bank transfer',
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-gray-700">
                <CheckCircle2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          {program?.audience_offer && (
            <div className="bg-blue-600 border border-blue-700 rounded-xl px-4 py-3 text-sm text-white">
              <strong>Bonus for your audience:</strong> {program.audience_offer} when they sign up through your link —
              they save, you earn.
            </div>
          )}
        </div>
        <ApplyForm />
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">How it works</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              title: '1. Apply & get approved',
              body: 'Tell us about your audience. We approve partners whose content genuinely helps freelancers and small agencies.',
            },
            {
              icon: Link2,
              title: '2. Share your link',
              body: `You get a unique ref code (${window.location.host}/?ref=yourcode). Clicks and signups are tracked automatically.`,
            },
            {
              icon: DollarSign,
              title: '3. Earn recurring commissions',
              body: 'Commissions land in your dashboard on every subscription payment — watch them stack in real time.',
            },
          ].map((step) => (
            <div key={step.title} className="bg-white rounded-2xl border border-gray-200 p-6">
              <step.icon size={26} className="text-blue-600 mb-3" />
              <h3 className="font-bold text-gray-900 mb-1.5">{step.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Per-plan earnings */}
      <section id="earnings" className="max-w-6xl mx-auto px-6 py-12 scroll-mt-24">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">What one referral earns you</h2>
        <p className="text-center text-gray-600 mb-10 max-w-2xl mx-auto">
          {firstMonthPct}% of month one, then {basePct}% of every payment for {months} months. Founding partners earn{' '}
          {founderPct}% recurring for the first {founder.months} months.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(paidPlans.length ? paidPlans : [{ id: 'pro', name: 'Pro', monthly: 19, annual: 0, collections: 0 }]).map((plan) => {
            const upfront = plan.monthly * (firstMonthPct / 100);
            const recurring = plan.monthly * (basePct / 100);
            const lifetime = upfront + recurring * (months - 1);
            const founderTotal =
              plan.monthly * (firstMonthPct / 100) +
              plan.monthly * founder.rate * Math.min(founder.months - 1, months - 1) +
              recurring * Math.max(0, months - Math.min(founder.months, months));
            return (
              <div key={plan.id} className="bg-white rounded-2xl border border-gray-200 p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">{plan.name}</p>
                <p className="mt-1 text-2xl font-extrabold text-gray-900">{money2(lifetime)}</p>
                <p className="text-xs text-gray-500">per referral over {months} months</p>
                <ul className="mt-4 space-y-1.5 text-sm text-gray-700">
                  <li>Upfront (month 1): <strong>{money2(upfront)}</strong></li>
                  <li>Then: <strong>{money2(recurring)}/mo</strong> for {months - 1} more months</li>
                  {slotsOpen && (
                    <li className="text-blue-700">As a founding partner: <strong>{money2(founderTotal)}</strong></li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rates & tiers */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-3">Rates, tiers &amp; payouts</h2>
        <p className="text-center text-gray-600 mb-10">
          No manual upgrades — your tier is recalculated automatically from this month's referred revenue.
        </p>
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-5 py-3 font-semibold">Tier</th>
                <th className="px-5 py-3 font-semibold">Monthly referred revenue</th>
                <th className="px-5 py-3 font-semibold">Renewal rate</th>
                <th className="px-5 py-3 font-semibold">First month</th>
              </tr>
            </thead>
            <tbody>
              {slotsOpen && (
                <tr className="border-t border-gray-100 bg-blue-50/60">
                  <td className="px-5 py-3 font-semibold text-blue-800">
                    Founding partner <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">First {founder.limit}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">Any — applies for {founder.months} months after approval</td>
                  <td className="px-5 py-3 font-bold text-blue-800">{founderPct}%</td>
                  <td className="px-5 py-3 font-bold text-blue-800">{firstMonthPct}%</td>
                </tr>
              )}
              {tiers.map((t, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-semibold text-gray-900">
                    {i === 0 ? 'Starter' : i === 1 ? 'Growth' : 'Elite'}
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {t.monthly_referred_revenue === 0
                      ? 'Under ' + money(tiers[1]?.monthly_referred_revenue ?? 500)
                      : money(t.monthly_referred_revenue) + '+'}
                  </td>
                  <td className="px-5 py-3 font-bold text-gray-900">{Math.round(t.rate * 100)}%</td>
                  <td className="px-5 py-3 text-gray-600">{firstMonthPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 grid sm:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
            <p className="font-semibold text-gray-900">Cookie window</p>
            <p className="text-gray-600 mt-0.5">{program?.cookie_days ?? 30} days — late signups still credit you</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
            <p className="font-semibold text-gray-900">Payout minimum</p>
            <p className="text-gray-600 mt-0.5">{money2(program?.payout_minimum ?? 20)}, paid monthly via PayPal, Wise or bank</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5">
            <p className="font-semibold text-gray-900">Commission window</p>
            <p className="text-gray-600 mt-0.5">{months} months per referred customer, from their first payment</p>
          </div>
        </div>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#apply" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-lg transition-colors">
            {slotsOpen ? `Claim a founding slot — ${founder.slots_remaining} left` : 'Apply to join'}
          </a>
          <Link to="/affiliates/resources" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            Get the promo kit &rarr;
          </Link>
        </div>
        <p className="text-center mt-4 text-sm text-gray-500 flex items-center justify-center gap-1">
          <Percent size={14} className="text-blue-600" />
          <span>
            Need copy, banners and templates?{' '}
            <Link to="/affiliates/resources" className="text-blue-600 hover:text-blue-700 font-medium">
              Affiliate resources &rarr;
            </Link>
          </span>
        </p>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-12 w-full">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Frequently asked questions</h2>
        <div className="space-y-4">
          {AFFILIATE_FAQ.map((item) => (
            <div key={item.q} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1.5">{item.q}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-8">
          <Link to="/affiliates/terms" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            Read the affiliate program terms &rarr;
          </Link>
        </p>
      </section>
    </MarketingShell>
  );
};
