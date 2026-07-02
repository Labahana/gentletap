"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  HorizontalBars,
  MetricTile,
  StatMiniCard,
  TrendBars,
} from "@/components/dashboard-parts";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, type AnalyticsData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatAvgDaysSub, formatMomPct } from "@/lib/dashboard-ui";
import { formatMoney, isOnboardingComplete } from "@/lib/onboarding";
import { hasWhatsapp } from "@/lib/pricing";

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  const load = useCallback(async () => {
    try {
      const [analytics, notes] = await Promise.all([
        api.analytics(),
        api.notifications(),
      ]);
      setData(analytics);
      setUnreadAlerts(notes.items.filter((n) => !n.read).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  useEffect(() => {
    if (user && !isOnboardingComplete(user)) router.replace("/onboarding");
  }, [user, router]);
  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loading || !user) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-40">
          <div className="h-6 w-32 animate-pulse rounded-xl bg-border" />
        </div>
      </DashboardShell>
    );
  }

  const currency = data?.currency ?? "USD";
  const emailReminders = data?.reminders_by_channel?.email ?? 0;
  const waReminders = data?.reminders_by_channel?.whatsapp ?? 0;
  const totalReminders = emailReminders + (hasWhatsapp(user.plan) ? waReminders : 0);
  const channelItems = [
    { label: "Email", value: emailReminders, className: "bg-accent" },
    ...(hasWhatsapp(user.plan)
      ? [{ label: "WhatsApp (Pro+)", value: waReminders, className: "bg-green" as const }]
      : []),
  ];
  const collectedThisMonth = data?.collection_trend?.[data.collection_trend.length - 1]?.collected ?? 0;

  return (
    <DashboardShell alertCount={unreadAlerts}>
      <div className="px-3.5 py-5 sm:px-5 lg:px-6 lg:py-5">
        <h1 className="text-base font-medium lg:text-[16px]">Analytics</h1>
        <p className="mt-0.5 text-[11px] text-muted">How GentleTap is performing for your business</p>

        {error && (
          <div className="mt-4 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">{error}</div>
        )}

        {data && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
              <MetricTile
                label="Collected"
                value={formatMoney(collectedThisMonth, currency)}
                sub={formatMomPct(data.collected_mom_pct)}
                subClass="text-green"
              />
              <MetricTile
                label="Response rate"
                value={data.response_rate != null ? `${data.response_rate}%` : "—"}
                sub={`${data.paid_this_month} paid this month`}
                subClass="text-green"
              />
              <MetricTile
                label="Reminders sent"
                value={String(data.reminders_sent_this_month)}
                sub="this month"
              />
              <MetricTile
                label="Active clients"
                value={String(data.total_clients)}
                sub={`${data.active_sequences} sequences running`}
              />
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="card !p-4">
                <h2 className="text-xs font-medium text-muted">Collection trend (6 months)</h2>
                <div className="mt-4">
                  <TrendBars data={data.collection_trend} currency={currency} />
                </div>
              </div>

              <div className="card !p-4">
                <h2 className="text-xs font-medium text-muted">Reminders by channel</h2>
                <div className="mt-4">
                  <HorizontalBars
                    items={channelItems}
                    formatValue={(v) =>
                      totalReminders > 0 ? `${v} (${Math.round((v / totalReminders) * 100)}%)` : String(v)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <StatMiniCard
                label="Clients by risk"
                value={`${data.clients_by_risk.high} high`}
                sub={`${data.clients_by_risk.medium} med · ${data.clients_by_risk.low} low`}
                barPct={
                  data.total_clients > 0
                    ? (data.clients_by_risk.high / data.total_clients) * 100
                    : 0
                }
                barClass="bg-red"
              />
              <StatMiniCard
                label="Avg payment speed"
                value={data.avg_days_to_pay != null ? `${data.avg_days_to_pay} days` : "—"}
                sub={formatAvgDaysSub(data.avg_days_delta, data.avg_days_last_month)}
                barPct={data.avg_days_to_pay != null ? Math.min(100, data.avg_days_to_pay * 3) : 0}
                barClass="bg-green"
              />
              <StatMiniCard
                label="Last month collected"
                value={formatMoney(data.collected_last_month, currency)}
                sub={formatMomPct(data.collected_mom_pct)}
                barPct={Math.min(100, data.collected_mom_pct ?? 0)}
                barClass="bg-accent-soft"
              />
            </div>

            <div className="card mt-4 !p-4">
              <h2 className="text-xs font-medium text-muted">Top outstanding clients</h2>
              {data.top_clients_outstanding.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No outstanding balances.</p>
              ) : (
                <div className="mt-3 divide-y divide-border/60">
                  {data.top_clients_outstanding.map((c) => (
                    <Link
                      key={c.id}
                      href={`/dashboard/clients/${c.id}`}
                      className="flex items-center justify-between py-2 hover:text-accent"
                    >
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-sm tabular-nums">{formatMoney(c.outstanding, currency)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
