import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Mail, Clock, Target } from 'lucide-react';
import { api } from '@/lib/api';

const StatCard: React.FC<{
  label: string;
  value: string;
  icon: React.ReactNode;
  delta?: number | null;
}> = ({ label, value, icon, delta }) => (
  <div className="bg-white border border-gray-200 rounded-xl p-5">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        {delta !== undefined && delta !== null && (
          <p
            className={`text-xs font-medium mt-1 flex items-center gap-1 ${
              delta >= 0 ? 'text-green-600' : 'text-rose-600'
            }`}
          >
            {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {delta >= 0 ? '+' : ''}
            {delta}% vs last month
          </p>
        )}
      </div>
      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
        {icon}
      </div>
    </div>
  </div>
);

export const Analytics: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => (await api.get('/analytics')).data,
  });

  if (isLoading || !data) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-100 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl" />
            ))}
          </div>
          <div className="h-72 bg-gray-100 rounded-xl" />
        </div>
      </div>
    );
  }

  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined
      ? '—'
      : `${data.currency === 'EUR' ? '€' : '$'}${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const trend = (data.collection_trend || []).map((t: any) => ({
    name: `${t.month} ${String(t.year).slice(2)}`,
    collected: t.collected,
  }));

  const risk = data.clients_by_risk || {};
  const riskData = [
    { name: 'Low risk', count: risk.low || 0, fill: '#22c55e' },
    { name: 'Medium risk', count: risk.medium || 0, fill: '#f59e0b' },
    { name: 'High risk', count: risk.high || 0, fill: '#f43f5e' },
  ];

  const channels = Object.entries(data.reminders_by_channel || {}).map(([name, count]) => ({
    name,
    count: count as number,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Helmet>
        <title>Analytics — GentleTap</title>
      </Helmet>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Collections performance and client insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Collected this month"
          value={fmt(trend.length ? trend[trend.length - 1].collected : undefined)}
          icon={<Target className="w-4 h-4" />}
          delta={data.collected_mom_pct}
        />
        <StatCard
          label="Reminders sent"
          value={String(data.reminders_sent_this_month ?? 0)}
          icon={<Mail className="w-4 h-4" />}
        />
        <StatCard
          label="Invoices paid this month"
          value={String(data.paid_this_month ?? 0)}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          label="Avg days to pay"
          value={data.avg_days_to_pay !== null && data.avg_days_to_pay !== undefined ? `${data.avg_days_to_pay}d` : '—'}
          icon={<Clock className="w-4 h-4" />}
          delta={null}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Collected — last 6 months</h2>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend}>
              <defs>
                <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
              <YAxis fontSize={12} stroke="#94a3b8" />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Area
                type="monotone"
                dataKey="collected"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#colorCollected)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Clients by payment risk</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
              <YAxis fontSize={12} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#2563eb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Top clients by outstanding balance</h2>
          <div className="space-y-3">
            {(data.top_clients_outstanding || []).length === 0 && (
              <p className="text-sm text-gray-400">No outstanding balances — nice work.</p>
            )}
            {(data.top_clients_outstanding || []).map((c: any, i: number) => (
              <div key={c.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700">{c.name}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{fmt(c.outstanding)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Reminders by channel</h2>
          <div className="grid grid-cols-2 gap-4">
            {channels.length === 0 && <p className="text-sm text-gray-400">No reminders sent yet.</p>}
            {channels.map((c) => (
              <div key={c.name} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-500">
                  <Mail className="w-4 h-4" />
                  <span className="text-xs font-medium capitalize">{c.name}</span>
                </div>
                <p className="text-xl font-bold text-gray-900 mt-1">{c.count}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-500">Response rate</p>
              <p className="font-semibold text-gray-900">
                {data.response_rate !== null && data.response_rate !== undefined ? `${data.response_rate}%` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Users className="w-3 h-3" /> Total clients
              </p>
              <p className="font-semibold text-gray-900">{data.total_clients ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
