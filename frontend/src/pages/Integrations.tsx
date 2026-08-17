import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plug, RefreshCw, CheckCircle2, AlertCircle, FileText, Zap } from 'lucide-react';
import { api } from '@/lib/api';

const XeroWaitlist: React.FC = () => {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const join = useMutation({
    mutationFn: async () => api.post('/public/waitlist', { email, provider: 'xero' }),
    onSuccess: () => setDone(true),
  });
  if (done) {
    return <p className="text-xs font-semibold text-emerald-700">You're on the list!</p>;
  }
  return (
    <div className="flex gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
      />
      <button
        onClick={() => join.mutate()}
        disabled={!email || join.isPending}
        className="bg-cyan-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
      >
        Notify Me
      </button>
    </div>
  );
};

export const Integrations: React.FC = () => {
  const queryClient = useQueryClient();
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: async () => {
      const res = await api.get('/connections');
      return res.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (id: string) => {
      setSyncingId(id);
      const res = await api.post(`/connections/${id}/sync`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert(`Sync completed! ${data.invoices_synced} invoices & ${data.clients_synced} clients updated.`);
    },
    onError: () => {
      alert('Sync failed');
    },
    onSettled: () => {
      setSyncingId(null);
    },
  });

  const handleConnectQBO = async () => {
    try {
      const res = await api.get('/connections/quickbooks/callback');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert(`QuickBooks connected! ${res.data.invoices_synced} invoices synced.`);
    } catch (err) {
      alert('Failed to connect QuickBooks');
    }
  };

  const handleConnectFreshBooks = async () => {
    try {
      const res = await api.get('/connections/freshbooks/callback');
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      alert(`FreshBooks connected! ${res.data.invoices_synced} invoices synced.`);
    } catch (err) {
      alert('Failed to connect FreshBooks');
    }
  };

  const qboConn = connections.find((c: any) => c.provider === 'quickbooks' && c.status === 'active');
  const fbConn = connections.find((c: any) => c.provider === 'freshbooks' && c.status === 'active');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Accounting Integrations</h1>
        <p className="text-sm text-gray-500 mt-1">Connect your accounting platforms to automatically sync clients and unpaid invoices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QuickBooks Online */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-lg border border-emerald-100">
                  QB
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">QuickBooks Online</h3>
                  <p className="text-xs text-gray-500">Auto-sync unpaid invoices & customers</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                qboConn ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                {qboConn ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {qboConn && (
              <div className="text-xs text-gray-500 bg-slate-50 p-3 rounded-lg border border-gray-100 mb-4 space-y-1">
                <div>Realm ID: <strong className="text-gray-800">{qboConn.realm_id || 'Sandbox'}</strong></div>
                <div>Last Synced: <strong className="text-gray-800">{qboConn.last_sync_at ? new Date(qboConn.last_sync_at).toLocaleString() : 'Just now'}</strong></div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            {qboConn ? (
              <button
                onClick={() => syncMutation.mutate(qboConn.id)}
                disabled={syncingId === qboConn.id}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingId === qboConn.id ? 'animate-spin' : ''}`} />
                <span>{syncingId === qboConn.id ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            ) : (
              <button
                onClick={handleConnectQBO}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shadow-xs"
              >
                Connect QuickBooks
              </button>
            )}
          </div>
        </div>

        {/* FreshBooks */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-lg border border-blue-100">
                  FB
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">FreshBooks</h3>
                  <p className="text-xs text-gray-500">Auto-sync clients & outstanding balances</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                fbConn ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                {fbConn ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {fbConn && (
              <div className="text-xs text-gray-500 bg-slate-50 p-3 rounded-lg border border-gray-100 mb-4 space-y-1">
                <div>Account ID: <strong className="text-gray-800">{fbConn.account_id || 'Active'}</strong></div>
                <div>Last Synced: <strong className="text-gray-800">{fbConn.last_sync_at ? new Date(fbConn.last_sync_at).toLocaleString() : 'Just now'}</strong></div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            {fbConn ? (
              <button
                onClick={() => syncMutation.mutate(fbConn.id)}
                disabled={syncingId === fbConn.id}
                className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold px-4 py-2 rounded-lg text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingId === fbConn.id ? 'animate-spin' : ''}`} />
                <span>{syncingId === fbConn.id ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            ) : (
              <button
                onClick={handleConnectFreshBooks}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs transition-colors shadow-xs"
              >
                Connect FreshBooks
              </button>
            )}
          </div>
        </div>

        {/* Xero (Coming Soon) */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 font-bold flex items-center justify-center text-lg border border-cyan-100">
                XR
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Xero</h3>
                <p className="text-xs text-gray-500">Auto-sync invoices & contacts</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-gray-100 text-gray-600 border-gray-200">
              Coming Soon
            </span>
          </div>
          <XeroWaitlist />
        </div>

        {/* CSV Manual Import Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 font-bold flex items-center justify-center text-lg border border-purple-100">
                CSV
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">CSV / Excel Upload</h3>
                <p className="text-xs text-gray-500">Manual import with column validation</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-purple-50 text-purple-700 border-purple-200">
              Available
            </span>
          </div>
          <a
            href="/invoices"
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium px-4 py-2 rounded-lg text-xs text-center transition-colors shadow-xs"
          >
            Go to CSV Import
          </a>
        </div>
      </div>
    </div>
  );
};
