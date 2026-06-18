"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getToken, type InvoiceItem } from "@/lib/api";
import { formatMoney, autoSyncStatusLine, isOnboardingComplete } from "@/lib/onboarding";
import { useAuth } from "@/lib/auth-context";

type Summary = {
  unpaid_count: number;
  overdue_count: number;
  total_outstanding: number;
  currency: string;
  green_count: number;
  yellow_count: number;
  red_count: number;
  active_sequences: number;
  monthly_collections: {
    monthly_limit: number;
    monthly_used: number;
    monthly_remaining: number;
    cap_reached: boolean;
  } | null;
  aging?: {
    current: { count: number; total: number };
    days_1_30: { count: number; total: number };
    days_31_60: { count: number; total: number };
    days_61_90: { count: number; total: number };
    days_90_plus: { count: number; total: number };
  };
};

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </div>
  );
}

function AgingBuckets({ aging, currency }: { aging: Summary["aging"]; currency: string }) {
  if (!aging) return null;
  const buckets = [
    { label: "Current", key: aging.current, color: "bg-green" },
    { label: "1–30d", key: aging.days_1_30, color: "bg-yellow" },
    { label: "31–60d", key: aging.days_31_60, color: "bg-accent-soft" },
    { label: "61–90d", key: aging.days_61_90, color: "bg-accent" },
    { label: "90d+", key: aging.days_90_plus, color: "bg-red" },
  ];
  const maxTotal = Math.max(...buckets.map((b) => b.key.total), 1);

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Aging breakdown</h2>
        <p className="text-xs text-muted">How long invoices have been unpaid</p>
      </div>
      <div className="space-y-3">
        {buckets.map(({ label, key, color }) => (
          <div key={label} className="flex items-center gap-3">
            <div className="w-16 shrink-0 text-right text-xs text-muted">{label}</div>
            <div className="flex-1 overflow-hidden rounded-full bg-border h-5">
              <div
                className={`h-full rounded-full ${color} transition-all`}
                style={{ width: maxTotal > 0 ? `${(key.total / maxTotal) * 100}%` : "0%" }}
              />
            </div>
            <div className="w-32 shrink-0 text-right text-xs">
              {key.count > 0 ? (
                <>
                  <span className="font-medium">{formatMoney(key.total, currency)}</span>
                  <span className="ml-1 text-muted">({key.count})</span>
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SequenceCell({ inv }: { inv: InvoiceItem }) {
  if (inv.dispute_flag) {
    return <span className="text-xs text-muted">Disputed · paused</span>;
  }
  if (inv.sequence_active && !inv.sequence_paused) {
    return <span className="text-xs font-medium text-green">Running</span>;
  }
  if (inv.sequence_paused) {
    return <span className="text-xs text-muted">Paused by you</span>;
  }
  if (inv.balance > 0 && inv.days_overdue > 0) {
    if (!inv.client_email) {
      return <span className="text-xs text-amber-700">Needs client email in QB</span>;
    }
    return <span className="text-xs text-muted">Starts automatically</span>;
  }
  return <span className="text-xs text-muted">—</span>;
}

function InsightBanner({ summary, invoices }: { summary: Summary; invoices: InvoiceItem[] }) {
  const stuck90 = summary.aging?.days_90_plus;
  const cap = summary.monthly_collections;

  if (cap?.cap_reached) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-900">Monthly collection limit reached</p>
            <p className="mt-0.5 text-sm text-amber-700">
              {cap.monthly_used}/{cap.monthly_limit} collections used this month. New overdue invoices won&apos;t get
              reminders until you upgrade.
            </p>
          </div>
          <Link href="/settings/billing" className="btn-primary shrink-0 py-2 text-xs">
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  if (stuck90 && stuck90.total > 0) {
    return (
      <div className="rounded-xl border border-red/30 bg-red/5 px-5 py-4">
        <p className="font-semibold text-red">
          {formatMoney(stuck90.total, summary.currency)} stuck for 90+ days
        </p>
        <p className="mt-0.5 text-sm text-muted">
          {stuck90.count} invoice{stuck90.count === 1 ? "" : "s"} may need a personal call or escalation.{" "}
          <Link href="/dashboard/escalations" className="font-medium text-foreground underline">
            View escalations →
          </Link>
        </p>
      </div>
    );
  }

  const inactive = invoices.filter(
    (i) => i.balance > 0 && !i.sequence_active && !i.sequence_paused && i.days_overdue > 0 && !i.dispute_flag,
  );
  if (inactive.length > 0) {
    const missingEmail = inactive.filter((i) => !i.client_email).length;
    return (
      <div className="rounded-xl border border-accent/25 bg-accent/5 px-5 py-4">
        <p className="font-semibold">
          {inactive.length} new overdue invoice{inactive.length === 1 ? "" : "s"} — reminders start automatically
        </p>
        <p className="mt-0.5 text-sm text-muted">
          GentleTap picks these up on the next QuickBooks sync (every 30 minutes). You don&apos;t need to do anything.
          {missingEmail > 0 &&
            ` ${missingEmail} need${missingEmail === 1 ? "s" : ""} a client email in QuickBooks first.`}
        </p>
      </div>
    );
  }

  if (summary.active_sequences > 0) {
    return (
      <div className="rounded-xl border border-green/30 bg-green/5 px-5 py-4">
        <p className="font-semibold text-green">
          {summary.active_sequences} reminder sequence{summary.active_sequences === 1 ? "" : "s"} running
        </p>
        <p className="mt-0.5 text-sm text-muted">
          GentleTap is following up automatically. You&apos;ll be notified if a client needs your personal attention.
        </p>
      </div>
    );
  }

  return null;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; body: string; read: boolean }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [onboardingNote, setOnboardingNote] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "needs_action">("all");
  const [qbSyncing, setQbSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const syncPollActive = useRef(false);

  useEffect(() => {
    const note = sessionStorage.getItem("onboarding_note");
    if (note) { setOnboardingNote(note); sessionStorage.removeItem("onboarding_note"); }
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
      setNotifications(notes.items.slice(0, 5));
      setLastSyncAt(sync.last_sync_at ?? null);
      if (sync.status === "syncing") {
        setQbSyncing(true);
        setSyncMessage(sync.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, []);

  const pollSyncUntilDone = useCallback(async () => {
    if (syncPollActive.current) return;
    syncPollActive.current = true;
    const token = getToken();
    if (!token) {
      syncPollActive.current = false;
      return;
    }
    try {
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const sync = await api.qbSyncStatus(token);
        setLastSyncAt(sync.last_sync_at ?? null);
        setSyncMessage(sync.message);
        if (sync.status !== "syncing") {
          setQbSyncing(false);
          setSyncMessage(null);
          await load();
          return;
        }
      }
    } catch {
      setError("QuickBooks sync failed");
    } finally {
      setQbSyncing(false);
      setSyncMessage(null);
      syncPollActive.current = false;
    }
  }, [load]);

  const startSyncPoll = useCallback(() => {
    void pollSyncUntilDone();
  }, [pollSyncUntilDone]);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (user && !isOnboardingComplete(user)) router.replace("/onboarding"); }, [user, router]);
  useEffect(() => { if (user) load(); }, [user, load]);

  // Refresh dashboard every 60s while tab is visible
  useEffect(() => {
    if (!user) return;
    const tick = () => {
      if (document.visibilityState === "visible") void load();
    };
    const interval = setInterval(tick, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, load]);

  // Resume polling if user lands on dashboard mid-sync
  useEffect(() => {
    if (!user || !qbSyncing) return;
    startSyncPoll();
  }, [user, qbSyncing, startSyncPoll]);

  if (loading || !user) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-40">
          <div className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded-xl bg-border" />
            <div className="h-4 w-64 animate-pulse rounded-xl bg-border" />
          </div>
        </div>
      </DashboardShell>
    );
  }

  async function invoiceAction(id: string, action: "pause" | "resume" | "dispute") {
    const token = getToken();
    if (!token || actionBusy) return;
    setActionBusy(id + action);
    try {
      if (action === "pause") await api.pauseInvoice(token, id);
      else if (action === "resume") await api.resumeInvoice(token, id);
      else if (action === "dispute") await api.markDispute(token, id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionBusy(null);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (filter === "active") return inv.sequence_active;
    if (filter === "needs_action") {
      return (
        inv.balance > 0 &&
        !inv.sequence_active &&
        !inv.sequence_paused &&
        inv.days_overdue > 0 &&
        !inv.dispute_flag
      );
    }
    return true;
  });

  const escalationCount = summary?.red_count ?? 0;

  return (
    <DashboardShell escalationCount={escalationCount}>
      <div className="px-8 py-8">
        {/* Page header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="mt-0.5 text-sm text-muted">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
            <p className="mt-1 text-xs text-muted">{autoSyncStatusLine(lastSyncAt)}</p>
            {syncMessage && <p className="mt-0.5 text-xs text-accent">{syncMessage}</p>}
            {summary && summary.active_sequences > 0 && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green/10 px-3 py-1 text-xs font-medium text-green">
                <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
                {summary.active_sequences} reminder{summary.active_sequences === 1 ? "" : "s"} running automatically
              </p>
            )}
          </div>
        </div>

        {/* Onboarding note */}
        {onboardingNote && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
            {onboardingNote}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red/30 bg-red/5 px-5 py-3 text-sm text-red">
            {error}
          </div>
        )}

        {/* KPI strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <KpiCard
            label="Outstanding"
            value={formatMoney(summary?.total_outstanding ?? 0, summary?.currency)}
            sub={`${summary?.unpaid_count ?? 0} unpaid invoices`}
            accent
          />
          <KpiCard
            label="Active sequences"
            value={String(summary?.active_sequences ?? 0)}
            sub="reminders running"
          />
          <KpiCard
            label="On track"
            value={String(summary?.green_count ?? 0)}
            sub="paid or within terms"
          />
          <KpiCard
            label="Needs you"
            value={String(escalationCount)}
            sub={escalationCount > 0 ? "personal follow-up needed" : "all clear"}
          />
        </div>

        {/* Insight banner */}
        {summary && (
          <div className="mt-5">
            <InsightBanner summary={summary} invoices={invoices} />
          </div>
        )}

        {/* Two-column: aging + activity */}
        <div className="mt-5 grid gap-5 xl:grid-cols-3">
          <div className="xl:col-span-2">
            {summary?.aging && (
              <AgingBuckets aging={summary.aging} currency={summary.currency ?? "USD"} />
            )}
          </div>

          {/* Recent activity */}
          <div className="card">
            <h2 className="font-semibold">Recent activity</h2>
            {notifications.length === 0 ? (
              <p className="mt-4 text-sm text-muted">No notifications yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-xl px-3 py-2.5 text-sm ${n.read ? "bg-background" : "bg-accent/5 border border-accent/20"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{n.title}</p>
                      {!n.read && (
                        <button
                          className="shrink-0 text-xs text-accent hover:underline"
                          onClick={async () => {
                            const token = getToken();
                            if (token) { await api.markNotificationRead(token, n.id); await load(); }
                          }}
                        >
                          ✓
                        </button>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{n.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Invoice table */}
        <div className="card mt-5" id="invoices">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Invoices</h2>
              <p className="text-xs text-muted">
                {summary?.monthly_collections
                  ? `${summary.monthly_collections.monthly_used}/${summary.monthly_collections.monthly_limit} collections this month`
                  : `${summary?.active_sequences ?? 0} active sequences`}
              </p>
            </div>
            <div className="flex gap-1 rounded-xl border border-border p-1 text-sm">
              {(["all", "active", "needs_action"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1 text-xs transition ${
                    filter === f ? "bg-accent text-white" : "text-muted hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "All" : f === "active" ? "Running" : "Starting soon"}
                </button>
              ))}
            </div>
          </div>

          {filteredInvoices.length === 0 ? (
            <div className="py-12 text-center">
              {invoices.length === 0 ? (
                <>
                  <p className="text-3xl">📋</p>
                  <p className="mt-3 font-medium">No invoices yet</p>
                  <p className="mt-1 text-sm text-muted">Connect QuickBooks to import unpaid invoices.</p>
                  <Link href="/onboarding" className="btn-primary mt-5 inline-flex text-sm py-2">
                    Complete setup
                  </Link>
                </>
              ) : (
                <p className="text-sm text-muted">No invoices matching this filter.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">Invoice</th>
                    <th className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">Client</th>
                    <th className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">Balance</th>
                    <th className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">Overdue</th>
                    <th className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">Sequence</th>
                    <th className="px-2 pb-3 text-xs font-semibold uppercase tracking-wide text-muted">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredInvoices.map((inv) => {
                    const busy = actionBusy?.startsWith(inv.id);
                    return (
                      <tr key={inv.id} className="group hover:bg-background/60 transition-colors">
                        <td className="px-2 py-3">
                          <Link
                            href={`/dashboard/invoices/${inv.id}`}
                            className="font-medium hover:text-accent hover:underline"
                          >
                            #{inv.doc_number ?? "—"}
                          </Link>
                          {inv.dispute_flag && (
                            <span className="ml-2 rounded-full bg-yellow/25 px-1.5 py-0.5 text-xs text-yellow-800">
                              Disputed
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <span className="max-w-[160px] truncate block">{inv.client_name}</span>
                          {inv.client_email && (
                            <span className="block truncate text-xs text-muted">{inv.client_email}</span>
                          )}
                        </td>
                        <td className="px-2 py-3 font-medium tabular-nums">
                          {formatMoney(inv.balance, inv.currency)}
                        </td>
                        <td className="px-2 py-3 tabular-nums">
                          {inv.days_overdue > 0 ? (
                            <span className={`font-medium ${inv.days_overdue > 60 ? "text-red" : inv.days_overdue > 30 ? "text-accent" : "text-muted"}`}>
                              {inv.days_overdue}d
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <SequenceCell inv={inv} />
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-2">
                            {inv.sequence_active && !inv.sequence_paused ? (
                              <button
                                disabled={!!busy}
                                onClick={() => invoiceAction(inv.id, "pause")}
                                className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-background disabled:opacity-50"
                              >
                                Pause
                              </button>
                            ) : inv.sequence_paused ? (
                              <button
                                disabled={!!busy}
                                onClick={() => invoiceAction(inv.id, "resume")}
                                className="rounded-lg border border-accent/40 px-2.5 py-1 text-xs text-accent hover:bg-accent/5 disabled:opacity-50"
                              >
                                Resume
                              </button>
                            ) : null}
                            <Link
                              href={`/dashboard/invoices/${inv.id}`}
                              className="text-xs text-muted hover:text-foreground"
                            >
                              View →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
