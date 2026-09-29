import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, AlertTriangle, CheckCircle2, HeartPulse, Server, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Badge, Section, Sparkline, StatCard, fmtMoney } from '@/components/admin/adminUi';
import type { Deliverability, Health, Stats, Timeseries } from '@/components/admin/types';

type Props = { onGoTab: (tab: string, params?: Record<string, string>) => void };

const HealthRow: React.FC<{ name: string; value: string }> = ({ name, value }) => {
  const status = typeof value === 'string' ? value : (value as { status?: string })?.status ?? 'unknown';
  const ok = status === 'ok' || status === 'healthy';
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-600 inline-flex items-center gap-1.5">
        <Server size={13} className="text-gray-400" /> {name}
      </span>
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${ok ? 'text-green-700' : 'text-red-600'}`}>
        {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />} {status}
      </span>
    </div>
  );
};

export const OverviewTab: React.FC<Props> = ({ onGoTab }) => {
  const { data: stats } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => (await api.get<Stats>('/admin/stats')).data,
    refetchInterval: 60_000,
  });
  const { data: ts } = useQuery({
    queryKey: ['admin', 'timeseries'],
    queryFn: async () => (await api.get<Timeseries>('/admin/metrics/timeseries', { params: { days: 14 } })).data,
  });
  const { data: health } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => (await api.get<Health>('/admin/health')).data,
    staleTime: 30_000,
  });
  const { data: deliv } = useQuery({
    queryKey: ['admin', 'deliverability'],
    queryFn: async () => (await api.get<Deliverability>('/admin/deliverability', { params: { days: 30 } })).data,
  });

  if (!stats) return <p className="text-gray-500">Loading stats…</p>;
  const sh = stats.subscription_health;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Organizations" value={stats.total_orgs} onClick={() => onGoTab('orgs')} />
        <StatCard label="Users" value={stats.total_users} sub={`${stats.signups_7d} joined in last 7d`} onClick={() => onGoTab('users')} />
        <StatCard label="MRR" value={fmtMoney(stats.mrr)} sub="active subscriptions only" />
        <StatCard
          label="Messages today"
          value={stats.messages_sent_today}
          onClick={() => onGoTab('jobs')}
          footer={<Sparkline data={ts?.signals.messages ?? []} />}
        />
        <StatCard label="Signups (14d)" value={ts?.signals.signups.reduce((a, b) => a + b, 0) ?? '—'} footer={<Sparkline data={ts?.signals.signups ?? []} />} />
        <StatCard label="Collected (30d)" value={fmtMoney(stats.collections_recovered_30d)} sub="invoices marked paid" />
        <StatCard
          label="Pending jobs"
          value={stats.pending_jobs}
          sub={`${stats.stuck_jobs} stuck · ${stats.failed_jobs_24h} failed 24h`}
          onClick={() => onGoTab('jobs', stats.stuck_jobs ? { status: 'stuck' } : undefined)}
        />
        <StatCard label="Active connections" value={stats.active_connections} onClick={() => onGoTab('orgs')} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section
          title="System health"
          actions={
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              recheck
            </button>
          }
        >
          {!health ? (
            <p className="text-sm text-gray-500">Checking…</p>
          ) : (
            <div>
              <HealthRow name="Database" value={health.db} />
              <HealthRow name="Redis" value={health.redis} />
              <HealthRow name="Celery workers" value={health.celery} />
            </div>
          )}
        </Section>

        <Section title="Subscription health" actions={<Badge tone="blue">{fmtMoney(stats.mrr)} MRR</Badge>}>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge tone="green">{sh.active} active</Badge>
            <Badge tone="amber">{sh.pending_setup} pending setup</Badge>
            {sh.trialing > 0 && <Badge tone="blue">{sh.trialing} trialing</Badge>}
            {sh.past_due > 0 && <Badge tone="red">{sh.past_due} past due</Badge>}
            {sh.canceled > 0 && <Badge tone="slate">{sh.canceled} canceled</Badge>}
          </div>
          <p className="text-xs text-gray-400 mt-3 inline-flex items-center gap-1">
            <HeartPulse size={12} /> Pending setup = signed up but never completed Paddle checkout.
          </p>
        </Section>

        <Section title="Deliverability by channel (30d)">
          {!deliv || deliv.channels.length === 0 ? (
            <p className="text-sm text-gray-500">No messages in window.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="py-1.5 pr-2">Channel</th>
                  <th className="py-1.5 pr-2">Sent</th>
                  <th className="py-1.5 pr-2">Delivered</th>
                  <th className="py-1.5 pr-2">Opened</th>
                  <th className="py-1.5 pr-2">Failed</th>
                  <th className="py-1.5">Rate</th>
                </tr>
              </thead>
              <tbody>
                {deliv.channels.map((c) => (
                  <tr key={c.channel} className="border-t border-gray-100">
                    <td className="py-2 pr-2 capitalize font-medium text-gray-800">{c.channel}</td>
                    <td className="py-2 pr-2 text-gray-600">{c.sent}</td>
                    <td className="py-2 pr-2 text-gray-600">{c.delivered}</td>
                    <td className="py-2 pr-2 text-gray-600">{c.opened}</td>
                    <td className="py-2 pr-2 text-gray-600">{c.failed}</td>
                    <td className="py-2">
                      <Badge tone={c.delivery_rate >= 90 ? 'green' : c.delivery_rate >= 70 ? 'amber' : 'red'}>
                        {c.delivery_rate}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Needs attention">
          <ul className="space-y-2 text-sm">
            {stats.stuck_jobs > 0 && (
              <li className="flex items-center gap-2 text-amber-700">
                <AlertTriangle size={15} /> {stats.stuck_jobs} stuck jobs —{' '}
                <button className="underline" onClick={() => onGoTab('jobs', { status: 'stuck' })}>
                  open jobs console
                </button>
              </li>
            )}
            {health && (health.db !== 'ok' || health.redis !== 'ok' || health.celery !== 'ok') && (
              <li className="flex items-center gap-2 text-red-600">
                <XCircle size={15} /> A service is unhealthy — check the health panel.
              </li>
            )}
            {sh.past_due > 0 && (
              <li className="flex items-center gap-2 text-red-600">
                <AlertTriangle size={15} /> {sh.past_due} subscriptions past due.
              </li>
            )}
            {stats.failed_jobs_24h > 0 && (
              <li className="flex items-center gap-2 text-gray-700">
                <Activity size={15} /> {stats.failed_jobs_24h} jobs failed in the last 24h.
              </li>
            )}
            {stats.stuck_jobs === 0 && sh.past_due === 0 && stats.failed_jobs_24h === 0 && health?.celery === 'ok' && (
              <li className="flex items-center gap-2 text-green-700">
                <CheckCircle2 size={15} /> All clear.
              </li>
            )}
          </ul>
        </Section>
      </div>
    </div>
  );
};
