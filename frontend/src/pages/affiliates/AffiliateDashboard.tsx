import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, DollarSign, ExternalLink, MousePointerClick, Users } from 'lucide-react';
import { Seo } from '../../components/marketing/Seo';
import { MarketingShell } from '../../components/marketing/MarketingShell';
import { api, apiErrorMessage } from '../../lib/api';
import { AFFILIATE_REFRESH_KEY, AFFILIATE_TOKEN_KEY } from '../../lib/affiliate';

type Dashboard = {
  affiliate: { name: string; email: string; ref_code: string; commission_rate: number };
  commission: {
    first_month_rate: number;
    base_rate: number;
    effective_rate: number;
    tier_rate: number;
    month_referred_revenue: number;
    next_tier_threshold: number | null;
    payout_minimum: number;
  };
  links: { home: string | null; signup: string | null; pricing: string | null };
  promotion: { audience_offer: string | null };
  stats: {
    clicks_total: number;
    clicks_30d: number;
    signups: number;
    active_subscribers: number;
    conversion_rate: number;
    pending_earnings: number;
    approved_earnings: number;
    paid_earnings: number;
    lifetime_earnings: number;
  };
  referrals: Array<{
    id: string;
    status: string;
    signed_up_at: string;
    org_email_masked: string;
    org_plan: string;
    commission_eligible: boolean;
  }>;
  commissions: Array<{
    id: string;
    event_type: string;
    gross_amount: number;
    commission_amount: number;
    currency: string;
    status: string;
    created_at: string;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    method: string;
    paid_at: string | null;
    created_at: string;
  }>;
};

const StatCard: React.FC<{ label: string; value: string; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
  <div className="bg-white rounded-2xl border border-gray-200 p-5">
    <Icon size={20} className="text-blue-600 mb-2" />
    <p className="text-2xl font-extrabold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
  </div>
);

export const AffiliateDashboard: React.FC = () => {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(AFFILIATE_TOKEN_KEY);
    if (!token) return;
    api
      .get('/affiliates/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setData(r.data))
      .catch((err) => {
        if (err?.response?.status === 401) {
          localStorage.removeItem(AFFILIATE_TOKEN_KEY);
          localStorage.removeItem(AFFILIATE_REFRESH_KEY);
        }
        setError(apiErrorMessage(err, 'Failed to load dashboard'));
      });
  }, []);

  if (!localStorage.getItem(AFFILIATE_TOKEN_KEY)) {
    return (
      <MarketingShell>
        <div className="max-w-md mx-auto px-6 py-24 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Affiliate login required</h1>
          <Link to="/affiliates/login" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg inline-block transition-colors">
            Go to login
          </Link>
        </div>
      </MarketingShell>
    );
  }

  if (error) {
    return (
      <MarketingShell>
        <div className="max-w-md mx-auto px-6 py-24 text-center text-red-600">{error}</div>
      </MarketingShell>
    );
  }

  if (!data) {
    return (
      <MarketingShell>
        <div className="max-w-4xl mx-auto px-6 py-24 text-center text-gray-500">Loading dashboard…</div>
      </MarketingShell>
    );
  }

  const signupLink = data.links.signup || '';
  const copyLink = () => {
    void navigator.clipboard.writeText(signupLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const money = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

  return (
    <MarketingShell>
      <Seo title="Affiliate Dashboard" description="Your GentleTap affiliate stats." path="/affiliates/dashboard" noindex />
      <div className="max-w-5xl mx-auto px-6 py-12 w-full">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Welcome back, {data.affiliate.name}</h1>
        <p className="text-gray-600 mb-8">
          Effective rate: {(data.commission.effective_rate * 100).toFixed(0)}%
          {data.commission.next_tier_threshold != null && (
            <> &middot; {money(data.commission.month_referred_revenue)} MTD referred revenue — next tier at {money(data.commission.next_tier_threshold)}</>
          )}
        </p>

        {/* Ref link */}
        <div className="bg-blue-600 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-blue-100 text-xs uppercase tracking-wide font-semibold mb-1">Your referral link</p>
            <p className="text-white font-mono text-sm truncate">{signupLink}</p>
          </div>
          <button onClick={copyLink} className="shrink-0 bg-white/10 hover:bg-white/20 border border-white/30 text-white text-sm font-medium px-4 py-2.5 rounded-lg inline-flex items-center gap-2 transition-colors">
            <Copy size={15} /> {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label={`Clicks (${data.stats.clicks_30d} in last 30d)`} value={String(data.stats.clicks_total)} icon={MousePointerClick} />
          <StatCard label={`Signups (${data.stats.active_subscribers} active)`} value={String(data.stats.signups)} icon={Users} />
          <StatCard label="Pending earnings" value={money(data.stats.pending_earnings)} icon={DollarSign} />
          <StatCard label="Lifetime earnings" value={money(data.stats.lifetime_earnings)} icon={DollarSign} />
        </div>

        {/* Referrals */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Referrals</h2>
          {data.referrals.length === 0 ? (
            <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-sm">
              No signups yet. Share your link above to get started.
            </p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Plan</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Signed up</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-5 py-3 text-gray-800">{r.org_email_masked}</td>
                      <td className="px-5 py-3 capitalize text-gray-600">{r.org_plan}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${r.status === 'active' ? 'bg-green-100 text-green-700' : r.status === 'churned' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{new Date(r.signed_up_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Commissions */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Commissions</h2>
          {data.commissions.length === 0 ? (
            <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-sm">
              Commissions appear here when a referral subscribes.
            </p>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Event</th>
                    <th className="px-5 py-3 font-semibold">Gross</th>
                    <th className="px-5 py-3 font-semibold">Commission</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.commissions.map((c) => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-5 py-3 text-gray-500">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 capitalize text-gray-800">{c.event_type}</td>
                      <td className="px-5 py-3 text-gray-600">{money(c.gross_amount)}</td>
                      <td className="px-5 py-3 font-semibold text-green-700">{money(c.commission_amount)}</td>
                      <td className="px-5 py-3 capitalize text-gray-600">{c.status.replace('_', ' ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Payouts */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Payouts{' '}
            <span className="text-xs font-normal text-gray-500">
              (minimum {money(data.commission.payout_minimum)}, paid monthly)
            </span>
          </h2>
          {data.payouts.length === 0 ? (
            <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-sm">
              No payouts yet. Payouts are issued monthly once your pending balance passes the minimum.
            </p>
          ) : (
            <ul className="space-y-2">
              {data.payouts.map((p) => (
                <li key={p.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900">{money(p.amount)}</span>
                  <span className="capitalize text-gray-600">{p.method.replace('_', ' ')}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {p.status}
                  </span>
                  <span className="text-gray-500">{p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {data.promotion.audience_offer && (
          <p className="mt-8 text-sm text-gray-500 flex items-center gap-1.5">
            <ExternalLink size={14} /> Promote it: your audience gets {data.promotion.audience_offer} through your link.
          </p>
        )}
      </div>
    </MarketingShell>
  );
};
