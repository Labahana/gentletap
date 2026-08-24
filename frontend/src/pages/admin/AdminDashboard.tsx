import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BadgeCheck,
  Building2,
  ClipboardList,
  DollarSign,
  Pause,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';

type Tab = 'overview' | 'affiliates' | 'orgs' | 'users' | 'audit';

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

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const cls =
    status === 'active'
      ? 'bg-green-100 text-green-700'
      : status === 'pending'
        ? 'bg-amber-100 text-amber-700'
        : status === 'paused'
          ? 'bg-slate-100 text-slate-600'
          : 'bg-red-100 text-red-700';
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
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

export const AdminDashboard: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [affiliates, setAffiliates] = useState<AffiliateRow[]>([]);
  const [affiliateStatus, setAffiliateStatus] = useState<string>('');
  const [payoutFor, setPayoutFor] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/access-check')
      .then((r) => {
        setIsAdmin(!!r.data.is_admin);
        setEmail(r.data.email ?? null);
      })
      .catch(() => setIsAdmin(false));
  }, []);

  const loadAffiliates = useCallback((status: string) => {
    setLoading(true);
    api.get('/affiliates/admin/list', { params: status ? { status } : {} })
      .then((r) => setAffiliates(r.data.items ?? []))
      .catch((err) => setError(apiErrorMessage(err, 'Failed to load affiliates')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    setError(null);
    if (tab === 'overview' && !stats) {
      api.get('/admin/stats').then((r) => setStats(r.data)).catch((err) => setError(apiErrorMessage(err, 'Failed to load stats')));
    } else if (tab === 'affiliates') {
      loadAffiliates(affiliateStatus);
    } else if (tab === 'orgs' && orgs.length === 0) {
      api.get('/admin/orgs').then((r) => setOrgs(r.data ?? [])).catch((err) => setError(apiErrorMessage(err, 'Failed to load orgs')));
    } else if (tab === 'users' && users.length === 0) {
      api.get('/admin/users').then((r) => setUsers(r.data.items ?? [])).catch((err) => setError(apiErrorMessage(err, 'Failed to load users')));
    } else if (tab === 'audit' && audit.length === 0) {
      api.get('/admin/audit-log').then((r) => setAudit(r.data.items ?? [])).catch((err) => setError(apiErrorMessage(err, 'Failed to load audit log')));
    }
  }, [tab, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const act = async (id: string, action: 'approve' | 'reject' | 'pause') => {
    await api.post(`/affiliates/admin/${id}/${action}`).catch((err) => setError(apiErrorMessage(err, `${action} failed`)));
    loadAffiliates(affiliateStatus);
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'affiliates', label: 'Affiliates', icon: BadgeCheck },
    { id: 'orgs', label: 'Organizations', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'audit', label: 'Audit log', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
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
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {error && (
          <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}

        {tab === 'overview' && (
          <div>
            {!stats ? (
              <p className="text-gray-500">Loading stats…</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Organizations', String(stats.total_orgs ?? '—')],
                  ['Users', String(stats.total_users ?? '—')],
                  ['MRR', `$${Number(stats.mrr ?? 0).toFixed(0)}`],
                  ['Messages today', String(stats.messages_sent_today ?? '—')],
                ].map(([label, val]) => (
                  <div key={label} className="bg-white rounded-2xl border border-gray-200 p-5">
                    <p className="text-2xl font-extrabold text-gray-900">{val}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                <Activity size={18} className="text-blue-600 mb-1.5" />
                <p className="text-sm font-semibold text-blue-900">{stats?.active_connections ?? '—'} active connections</p>
                <p className="text-xs text-blue-700/70">QuickBooks / FreshBooks links in good standing</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <BadgeCheck size={18} className="text-blue-600 mb-1.5" />
                <p className="text-sm font-semibold text-gray-800">{affiliates.length || '—'} affiliates visible</p>
                <p className="text-xs text-gray-500">Manage applications & payouts in the Affiliates tab</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <ShieldCheck size={18} className="text-blue-600 mb-1.5" />
                <p className="text-sm font-semibold text-gray-800">Signed in as admin</p>
                <p className="text-xs text-gray-500 truncate">{email}</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'affiliates' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Affiliate partners</h2>
              <div className="flex items-center gap-2">
                <select
                  value={affiliateStatus}
                  onChange={(e) => {
                    setAffiliateStatus(e.target.value);
                    loadAffiliates(e.target.value);
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button onClick={() => loadAffiliates(affiliateStatus)} className="border border-gray-300 hover:border-blue-400 rounded-lg px-3 py-2 text-sm inline-flex items-center gap-1.5">
                  <RefreshCw size={14} /> Refresh
                </button>
              </div>
            </div>
            {loading ? (
              <p className="text-gray-500">Loading…</p>
            ) : affiliates.length === 0 ? (
              <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-sm">No affiliates found.</p>
            ) : (
              <div className="space-y-3">
                {affiliates.map((a) => (
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
                        <StatusPill status={a.status} />
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
                      <PayoutForm affiliateId={a.id} onDone={() => { setPayoutFor(null); loadAffiliates(affiliateStatus); }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'orgs' && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Collections used</th>
                  <th className="px-5 py-3 font-semibold">WhatsApp used</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((o) => (
                  <tr key={o.id} className="border-t border-gray-100">
                    <td className="px-5 py-3 font-medium text-gray-800">{o.name}</td>
                    <td className="px-5 py-3 capitalize text-gray-600">{String(o.plan)}</td>
                    <td className="px-5 py-3 text-gray-600">{o.collections_used}/{o.collections_quota ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-600">{o.whatsapp_used}</td>
                    <td className="px-5 py-3 text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Name</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-gray-100">
                    <td className="px-5 py-3 text-gray-800">{u.email}</td>
                    <td className="px-5 py-3 text-gray-600">{u.full_name ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-500">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'audit' && (
          <div className="space-y-2">
            {audit.length === 0 ? (
              <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-sm">No audit events recorded.</p>
            ) : (
              audit.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-xl px-5 py-3.5 text-sm flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-gray-800">{item.action}</span>
                    <span className="text-gray-500"> · {item.entity_type}{item.entity_id ? `#${String(item.entity_id).slice(0, 8)}` : ''}</span>
                  </div>
                  <span className="text-gray-400 text-xs">{item.created_at ? new Date(item.created_at).toLocaleString() : ''}</span>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
