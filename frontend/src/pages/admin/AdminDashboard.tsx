import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  Building2,
  ClipboardList,
  DollarSign,
  LifeBuoy,
  Pause,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { api, apiErrorMessage } from '@/lib/api';
import { useAdminAccess } from '@/hooks/useIsAdmin';
import { Badge, Spinner } from '@/components/admin/adminUi';
import { OverviewTab } from '@/components/admin/OverviewTab';
import { OrganizationsTab } from '@/components/admin/OrganizationsTab';
import { UsersTab } from '@/components/admin/UsersTab';
import { JobsTab } from '@/components/admin/JobsTab';
import { AuditTab } from '@/components/admin/AuditTab';
import { SupportTab } from '@/components/admin/SupportTab';

type Tab = 'overview' | 'affiliates' | 'orgs' | 'users' | 'jobs' | 'audit' | 'support';

type AffiliateRow = {
  id: string;
  name: string;
  email: string;
  status: string;
  ref_code: string | null;
  channel_name: string | null;
  partner_type: string;
  commission_rate: number;
  signups: number;
  active_subscribers: number;
  lifetime_earnings: number;
  created_at: string;
};

const PayoutForm: React.FC<{ affiliateId: string; onDone: () => void }> = ({ affiliateId, onDone }) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('paypal');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post(`/affiliates/admin/${affiliateId}/payout`, {
        amount: parseFloat(amount),
        method,
        reference: reference || null,
      });
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err, 'Payout failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 bg-slate-50 border border-gray-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
      {error && <p className="text-xs text-red-600 w-full">{error}</p>}
      <div>
        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Amount (USD)</label>
        <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32" />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Method</label>
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <option value="paypal">PayPal</option>
          <option value="wise">Wise</option>
          <option value="bank_transfer">Bank transfer</option>
        </select>
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Reference</label>
        <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="txn id / receipt" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
      </div>
      <button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg">
        {busy ? 'Recording…' : 'Record payout'}
      </button>
    </form>
  );
};

const AffiliatesTab: React.FC = () => {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [payoutFor, setPayoutFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'affiliates', status],
    queryFn: async () =>
      (await api.get<{ items: AffiliateRow[] }>('/affiliates/admin/list', { params: { status: status || undefined, limit: 100 } })).data,
  });

  const act = async (id: string, action: 'approve' | 'reject' | 'pause') => {
    try {
      await api.post(`/affiliates/admin/${id}/${action}`);
      qc.invalidateQueries({ queryKey: ['admin', 'affiliates'] });
    } catch (err) {
      setError(apiErrorMessage(err, `${action} failed`));
    }
  };

  const affiliates = data?.items ?? [];
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="rejected">Rejected</option>
        </select>
        {isFetching && <Spinner />}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      {affiliates.length === 0 ? (
        <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-sm">No affiliates found.</p>
      ) : (
        <div className="space-y-3">
          {affiliates.map((a: AffiliateRow) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-900">
                    {a.name} <span className="font-normal text-gray-500 text-sm">({a.email})</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.partner_type}{a.channel_name ? ` · ${a.channel_name}` : ''}
                    {a.ref_code ? ` · ref: ${a.ref_code}` : ' · no ref yet'} · rate {(a.commission_rate * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.signups} signups ({a.active_subscribers} active) · lifetime earnings ${a.lifetime_earnings.toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={a.status === 'active' ? 'green' : a.status === 'pending' ? 'amber' : a.status === 'paused' ? 'slate' : 'red'}>
                    {a.status}
                  </Badge>
                  {a.status === 'pending' && (
                    <>
                      <button onClick={() => act(a.id, 'approve')} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Approve</button>
                      <button onClick={() => act(a.id, 'reject')} className="border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold px-3 py-1.5 rounded-lg">Reject</button>
                    </>
                  )}
                  {a.status === 'active' && (
                    <>
                      <button onClick={() => setPayoutFor(payoutFor === a.id ? null : a.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                        <DollarSign size={12} /> Payout
                      </button>
                      <button onClick={() => act(a.id, 'pause')} title="Pause" className="border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
                        <Pause size={12} />
                      </button>
                    </>
                  )}
                  {a.status === 'paused' && (
                    <button onClick={() => act(a.id, 'approve')} className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">Reactivate</button>
                  )}
                </div>
              </div>
              {payoutFor === a.id && (
                <PayoutForm
                  affiliateId={a.id}
                  onDone={() => {
                    setPayoutFor(null);
                    qc.invalidateQueries({ queryKey: ['admin', 'affiliates'] });
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminDashboard: React.FC = () => {
  const { isAdmin, email } = useAdminAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) || 'overview';
  const jobStatus = searchParams.get('status') || undefined;

  const goTab = useCallback(
    (next: string, params?: Record<string, string>) => {
      setSearchParams((prev) => {
        const p = new URLSearchParams(prev);
        p.set('tab', next);
        ['status', 'org', 'handoff'].forEach((k) => p.delete(k));
        if (params) Object.entries(params).forEach(([k, v]) => p.set(k, v));
        return p;
      });
    },
    [setSearchParams],
  );

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'affiliates', label: 'Affiliates', icon: BadgeCheck },
    { id: 'orgs', label: 'Organizations', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'jobs', label: 'Jobs', icon: Wrench },
    { id: 'support', label: 'Support', icon: LifeBuoy },
    { id: 'audit', label: 'Audit log', icon: ClipboardList },
  ];

  if (isAdmin === null) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-gray-500">Checking access…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md text-center shadow-sm">
          <ShieldAlert size={40} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-gray-900 mb-1.5">Admin access required</h1>
          <p className="text-sm text-gray-600 mb-5">
            The signed-in account{email ? ` (${email})` : ''} is not on the admin allow-list.
          </p>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header className="h-14 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-blue-600" />
          <span className="font-bold text-gray-900">GentleTap Admin</span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500 hidden sm:block">{email}</span>
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-700 font-medium">App</Link>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-6 flex gap-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => goTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {tab === 'overview' && <OverviewTab onGoTab={goTab} />}
        {tab === 'affiliates' && <AffiliatesTab />}
        {tab === 'orgs' && <OrganizationsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'jobs' && <JobsTab key={jobStatus ?? 'all'} initialStatus={jobStatus} />}
        {tab === 'support' && <SupportTab />}
        {tab === 'audit' && <AuditTab />}
      </main>
    </div>
  );
};
