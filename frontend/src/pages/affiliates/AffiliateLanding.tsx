import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, DollarSign, Link2, Percent, Users } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell } from '../../components/marketing/MarketingShell';
import { api, apiErrorMessage } from '../../lib/api';
import { AFFILIATE_FAQ } from '../../data/seo-content';
import { faqJsonLd } from '../../data/seo';

type ProgramInfo = {
  commission_rate: number;
  first_month_rate: number;
  commission_months: number;
  cookie_days: number;
  payout_minimum: number;
  referral_discount_percent: number;
  referral_discount_months: number;
  description: string;
  audience_offer: string | null;
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
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <CheckCircle2 size={40} className="text-green-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-gray-900 mb-1.5">Application received</h3>
        <p className="text-gray-600">We'll review it and email you when your account is approved.</p>
        <Link to="/affiliates/login" className="inline-block mt-4 text-blue-600 hover:text-blue-700 font-medium">
          Affiliate login &rarr;
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 space-y-4">
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

export const AffiliateLanding: React.FC = () => {
  const [program, setProgram] = useState<ProgramInfo | null>(null);

  useEffect(() => {
    api.get('/affiliates/program').then((r) => setProgram(r.data)).catch(() => undefined);
  }, []);

  const firstMonthPct = program ? Math.round(program.first_month_rate * 100) : 50;
  const basePct = program ? Math.round(program.commission_rate * 100) : 30;
  const months = program?.commission_months ?? 24;

  return (
    <MarketingShell>
      <Seo
        title="GentleTap Affiliate Program — 50% First Month + Recurring"
        description={`Earn ${firstMonthPct}% of each referral's first month plus ${basePct}% recurring for ${months} months promoting GentleTap. Free to join, monthly payouts.`}
        path="/affiliates"
        jsonLd={[faqJsonLd(AFFILIATE_FAQ)]}
      />
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-10 grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 mb-3">Affiliate program</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
            Get paid to help freelancers get paid
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            {program?.description ||
              `Earn ${firstMonthPct}% of each referral's first month plus ${basePct}% of every subscription payment for ${months} months per referred customer.`}
          </p>
          <ul className="space-y-3 mb-8">
            {[
              `${firstMonthPct}% first-month bounty + ${basePct}% recurring for ${months} months`,
              'Automatic performance tiers up to 40% renewal rate',
              'Monthly payouts — PayPal, Wise, or bank transfer',
              'Free to join — approved creators only',
            ].map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-gray-700">
                <CheckCircle2 size={18} className="text-blue-600 mt-0.5 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
          {program?.audience_offer && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-900">
              <strong>Bonus for your audience:</strong> {program.audience_offer} when they sign up through your link.
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
              body: 'Tell us about your audience. We approve partners whose content genuinely helps freelancers.',
            },
            {
              icon: Link2,
              title: '2. Share your link',
              body: `You get a unique ref code (${window.location.host}/?ref=yourcode). Clicks and signups are tracked automatically.`,
            },
            {
              icon: DollarSign,
              title: '3. Earn recurring commissions',
              body: 'Commissions attach to your dashboard on every subscription payment — watch them stack in real time.',
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

      {/* Earnings example */}
      <section className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-blue-600 rounded-2xl p-8 text-white text-center">
          <Percent size={28} className="mx-auto mb-3 text-blue-200" />
          <h2 className="text-2xl font-bold mb-3">What one Pro referral earns you</h2>
          <p className="text-blue-100 max-w-2xl mx-auto">
            On the $19/mo Pro plan: ${(19 * (firstMonthPct / 100)).toFixed(2)} up front + $
            {(19 * (basePct / 100)).toFixed(2)}/month for {months - 1} more months — that's $
            {(19 * (firstMonthPct / 100) + 19 * (basePct / 100) * (months - 1)).toFixed(2)} per referral over
            the full commission window.
          </p>
        </div>
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
