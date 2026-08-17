import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  AlertCircle,
  Send,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { EscalationRow, Escalation } from '@/components/EscalationRow';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data,
  });

  const { data: charts, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboardCharts'],
    queryFn: async () => (await api.get('/dashboard/charts?range=90d')).data,
  });

  const { data: escalations = [] } = useQuery({
    queryKey: ['dashboardEscalations'],
    queryFn: async () => (await api.get('/dashboard/escalations')).data,
  });

  const sendNow = useMutation({
    mutationFn: async (invoiceId: string) => api.post(`/invoices/${invoiceId}/send-now`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardEscalations'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
  });

  const pause = useMutation({
    mutationFn: async (invoiceId: string) => api.post(`/invoices/${invoiceId}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboardEscalations'] }),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Outstanding balances, automation activity, and invoices that need attention.
          </p>
        </div>
        <Link to="/escalations" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
          View all escalations <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          {
            label: 'Total Outstanding',
            value: `$${(summary?.total_outstanding || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            hint: 'Awaiting payment',
            icon: DollarSign,
            color: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Expected (7d)',
            value: `$${(summary?.expected_collections_7d || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
            hint: 'Due within a week',
            icon: TrendingUp,
            color: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'At-Risk (30+)',
            value: summaryLoading ? '…' : summary?.at_risk_count || 0,
            hint: 'Needs follow-up',
            icon: AlertCircle,
            color: 'bg-rose-50 text-rose-600',
          },
          {
            label: 'Active Campaigns',
            value: summaryLoading ? '…' : summary?.active_campaigns_count || 0,
            hint: 'Sequences running',
            icon: Activity,
            color: 'bg-violet-50 text-violet-600',
          },
          {
            label: 'Recent Payments',
            value: summaryLoading ? '…' : summary?.recent_payments_count || 0,
            hint: 'Last 7 days',
            icon: CheckCircle,
            color: 'bg-emerald-50 text-emerald-600',
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
              <div className="text-[11px] text-gray-500 mt-1">{kpi.hint}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-900">Collections Over Time</h3>
              <p className="text-xs text-gray-500">Cumulative payments vs remaining balance</p>
            </div>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">90 days</span>
          </div>
          <div className="h-64 w-full">
            {chartsLoading || !charts ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.points}>
                  <defs>
                    <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="collected" stroke="#2563eb" fill="url(#colGrad)" name="Collected" />
                  <Area type="monotone" dataKey="outstanding" stroke="#f59e0b" fill="transparent" name="Outstanding" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 mb-1">Recent Activity</h3>
          <p className="text-xs text-gray-500 mb-4">Payments and sends</p>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {(summary?.recent_activities || []).length === 0 && (
              <p className="text-xs text-gray-400">No activity yet.</p>
            )}
            {(summary?.recent_activities || []).map((a: any) => (
              <div key={a.id} className="flex gap-3">
                <div
                  className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    a.type === 'payment' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {a.type === 'payment' ? <CheckCircle className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-900">{a.title}</div>
                  <div className="text-[11px] text-gray-500">{a.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-6 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-gray-900">Escalations</h3>
            <Link to="/escalations" className="text-xs font-medium text-blue-600">
              See all
            </Link>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="py-2 px-3">Invoice</th>
                <th className="py-2 px-3">Client</th>
                <th className="py-2 px-3">Amount</th>
                <th className="py-2 px-3">Overdue</th>
                <th className="py-2 px-3">Sent</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {(escalations as Escalation[]).slice(0, 5).map((item) => (
                <EscalationRow
                  key={item.invoice_id}
                  item={item}
                  onSendNow={(id) => sendNow.mutate(id)}
                  onPause={(id) => pause.mutate(id)}
                />
              ))}
              {!escalations.length && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-xs text-gray-400">
                    No at-risk invoices right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <h3 className="text-base font-bold text-gray-900 mb-1">Recovery by Client</h3>
          <p className="text-xs text-gray-500 mb-4">Paid invoice rate</p>
          <div className="h-56">
            {charts?.recovery_by_client?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.recovery_by_client} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="client_name" width={80} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="recovery_rate" fill="#2563eb" name="Recovery %" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">No client data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
