"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityFeed,
  AutopilotBar,
  EscalationBanner,
  InvoiceOverviewRow,
  MetricTile,
  NotifBell,
  StatMiniCard,
} from "@/components/dashboard-parts";
import { DashIcon } from "@/components/dashboard-icons";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardUpgradeCard } from "@/components/upgrade-prompt";
import { api, getToken, type DashboardSummary, type InvoiceItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  greetingName,
  lastActionLine,
  lastActionShort,
  syncSubline,
  timeOfDayGreeting,
  formatMomPct,
  formatAvgDaysSub,
} from "@/lib/dashboard-ui";
import { formatMoney, isOnboardingComplete } from "@/lib/onboarding";

const ESC_DISMISS_KEY = "gentletap_esc_dismiss";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [onboardingNote, setOnboardingNote] = useState<string | null>(null);
  const [onboardingWelcome, setOnboardingWelcome] = useState<{
    activated: number;
    skipped: number;
  } | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [escDismissed, setEscDismissed] = useState(false);

  useEffect(() => {
    const note = sessionStorage.getItem("onboarding_note");
    if (note) {
      setOnboardingNote(note);
      sessionStorage.removeItem("onboarding_note");
    }
    const welcomeRaw = sessionStorage.getItem("onboarding_welcome");
    if (welcomeRaw) {
      try {
        const parsed = JSON.parse(welcomeRaw) as { activated: number; skipped?: number };
        if (parsed.activated > 0) {
          setOnboardingWelcome({ activated: parsed.activated, skipped: parsed.skipped ?? 0 });
        }
      } catch {
        /* ignore */
      }
      sessionStorage.removeItem("onboarding_welcome");
    }
    if (sessionStorage.getItem(ESC_DISMISS_KEY) === "1") setEscDismissed(true);
  }, []);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [s, inv, notes, sync] = await Promise.all([
        api.invoicesSummary(token),
        api.invoices(token),
        api.notifications(token),
        api.qbSyncStatus(token),
      ]);
      setSummary(s);
      setInvoices(inv.items);
      setUnreadAlerts(notes.items.filter((n) => !n.read).length);
      setLastSyncAt(sync.last_sync_at ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
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

  useEffect(() => {
    if (!user) return;
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const interval = setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [user, load]);

  if (loading || !user) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-40">
          <div className="h-6 w-48 animate-pulse rounded-xl bg-border" />
        </div>
      </DashboardShell>
    );
  }

  const currency = summary?.currency ?? "USD";
  const activeInvoices = invoices.filter((i) => i.balance > 0).slice(0, 5);
  const collected = summary?.collected_this_month ?? 0;
  const collectionRate = summary?.collection_rate ?? 0;
  const responseRate = summary?.response_rate;
  const timeSavedHrs = summary?.time_saved_hours ?? 0;
  const timeSavedVal = summary?.time_saved_value ?? 0;
  const totalPool = collected + (summary?.total_outstanding ?? 0);

  function dismissEsc() {
    sessionStorage.setItem(ESC_DISMISS_KEY, "1");
    setEscDismissed(true);
  }

  return (
    <DashboardShell
      alertCount={unreadAlerts}
      autopilotOn={(summary?.active_sequences ?? 0) > 0}
      monthlyUsed={summary?.monthly_collections?.monthly_used}
      monthlyLimit={summary?.monthly_collections?.monthly_limit}
    >
      <div className="px-3.5 py-5 sm:px-5 lg:px-6 lg:py-5">
        {/* Topbar */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-medium lg:text-[16px]">
              {timeOfDayGreeting()}, {greetingName(user.full_name, user.email)}
            </h1>
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
              <DashIcon name="circleCheck" size={12} className="text-green" />
              <span className="lg:hidden">{syncSubline(lastSyncAt, true)}</span>
              <span className="hidden lg:inline">{syncSubline(lastSyncAt)}</span>
            </p>
          </div>
          <NotifBell href="/dashboard/alerts" unread={unreadAlerts} />
        </div>

        <DashboardUpgradeCard
          monthlyUsed={summary?.monthly_collections?.monthly_used}
          monthlyLimit={summary?.monthly_collections?.monthly_limit}
        />

        {onboardingWelcome && (
          <div className="mb-4 rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-4">
            <p className="font-semibold text-green-800">
              Autopilot is on — {onboardingWelcome.activated} reminder sequence
              {onboardingWelcome.activated === 1 ? "" : "s"} active
            </p>
            <p className="mt-1 text-sm text-green-800/90">
              GentleTap will follow up automatically and stop when QuickBooks shows payment received.
            </p>
            <Link href="/dashboard/invoices" className="mt-2 inline-block text-sm font-medium text-accent hover:underline">
              View active sequences →
            </Link>
          </div>
        )}
        {onboardingNote && (
          <div className="mb-4 rounded-xl border border-yellow/40 bg-yellow/10 px-3 py-2 text-sm">{onboardingNote}</div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">{error}</div>
        )}

        {/* Autopilot bar */}
        <div className="mb-5">
          <div className="lg:hidden">
            <AutopilotBar
              compact
              activeSequences={summary?.active_sequences ?? 0}
              lastActionLine={lastActionLine(summary?.last_action)}
              lastActionShort={lastActionShort(summary?.last_action)}
            />
          </div>
          <div className="hidden lg:block">
            <AutopilotBar
              activeSequences={summary?.active_sequences ?? 0}
              lastActionLine={lastActionLine(summary?.last_action)}
            />
          </div>
        </div>

        {/* Metrics */}
        <div className="mb-5 lg:hidden">
          <MetricTile
            hero
            label="Total outstanding"
            value={formatMoney(summary?.total_outstanding ?? 0, currency)}
            sub={`across ${summary?.unpaid_count ?? 0} invoices`}
          />
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <MetricTile
              label="This week"
              value={formatMoney(summary?.expected_this_week ?? 0, currency)}
              sub="expected"
              subClass="text-green"
            />
            <MetricTile
              label="Collected"
              value={formatMoney(collected, currency)}
              sub={formatMomPct(summary?.collected_mom_pct)}
              subClass="text-green"
            />
            <MetricTile
              label="Avg payment"
              value={summary?.avg_days_to_pay != null ? `${summary.avg_days_to_pay} days` : "—"}
              sub={formatAvgDaysSub(summary?.avg_days_delta, summary?.avg_days_last_month)}
              subClass="text-green"
            />
            <MetricTile
              label="Time saved"
              value={`${Math.round(timeSavedHrs)} hrs`}
              sub="this month"
              subClass="text-green"
            />
          </div>
        </div>

        <div className="mb-5 hidden grid-cols-4 gap-2.5 lg:grid">
          <MetricTile
            label="Outstanding"
            value={formatMoney(summary?.total_outstanding ?? 0, currency)}
            sub={`${summary?.unpaid_count ?? 0} invoices`}
            subClass="text-yellow-900"
          />
          <MetricTile
            label="Expected this week"
            value={formatMoney(summary?.expected_this_week ?? 0, currency)}
            sub={`${summary?.expected_this_week_count ?? 0} invoices due soon`}
            subClass="text-green"
          />
          <MetricTile
            label="Collected this month"
            value={formatMoney(collected, currency)}
            sub={formatMomPct(summary?.collected_mom_pct)}
            subClass="text-green"
          />
          <MetricTile
            label="Avg days to pay"
            value={summary?.avg_days_to_pay != null ? `${summary.avg_days_to_pay} days` : "—"}
            sub={formatAvgDaysSub(summary?.avg_days_delta, summary?.avg_days_last_month)}
            subClass="text-green"
          />
        </div>

        {/* Escalation banner — desktop sample */}
        {!escDismissed && summary?.featured_escalation && (
          <div className="mb-5 hidden lg:block">
            <EscalationBanner message={summary.featured_escalation.message} onDismiss={dismissEsc} />
          </div>
        )}

        {/* Mobile: activity only (sample home screen) */}
        <div className="lg:hidden">
          <p className="mb-2 text-xs font-medium text-muted">What GentleTap did today</p>
          <ActivityFeed items={summary?.activity ?? []} currency={currency} compact />
        </div>

        {/* Desktop: two-col — invoices LEFT, activity RIGHT (sample order) */}
        <div className="hidden gap-3 lg:grid lg:grid-cols-[1.6fr_1fr]">
          <div className="card !p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-medium text-muted">Active invoices</h2>
              <Link href="/dashboard/invoices" className="text-[11px] text-accent hover:underline">
                View all →
              </Link>
            </div>
            {activeInvoices.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">
                {invoices.length === 0 ? (
                  <>
                    No invoices yet.{" "}
                    <Link href="/settings/connections" className="text-accent underline">
                      Connect QuickBooks
                    </Link>
                  </>
                ) : (
                  "All caught up."
                )}
              </p>
            ) : (
              activeInvoices.map((inv) => <InvoiceOverviewRow key={inv.id} inv={inv} />)
            )}
          </div>

          <div className="card !p-4">
            <h2 className="mb-2.5 text-xs font-medium text-muted">What GentleTap did today</h2>
            <ActivityFeed items={summary?.activity ?? []} currency={currency} />
          </div>
        </div>

        {/* Bottom stats — desktop sample */}
        <div className="mt-5 hidden grid-cols-3 gap-3 lg:grid">
          <StatMiniCard
            label="Collection rate this month"
            value={`${collectionRate}%`}
            sub={`${formatMoney(collected, currency)} of ${formatMoney(totalPool, currency)}`}
            barPct={collectionRate}
            barClass="bg-green"
          />
          <StatMiniCard
            label="Client response rate"
            value={responseRate != null ? `${responseRate}%` : "—"}
            sub={`${summary?.reminders_sent_this_month ?? 0} reminders sent`}
            barPct={responseRate ?? 0}
            barClass="bg-accent"
          />
          <StatMiniCard
            label="Time saved this month"
            value={`${Math.round(timeSavedHrs)} hrs saved`}
            sub={`worth ~${formatMoney(timeSavedVal, currency)}`}
            barPct={Math.min(100, timeSavedHrs * 5)}
            barClass="bg-accent-soft"
          />
        </div>
      </div>
    </DashboardShell>
  );
}
