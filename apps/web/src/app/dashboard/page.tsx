"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, getToken, type InvoiceItem } from "@/lib/api";
import { formatMoney, isOnboardingComplete } from "@/lib/onboarding";
import { planLabel } from "@/lib/pricing";
import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<{
    green_count: number;
    yellow_count: number;
    red_count: number;
    total_outstanding: number;
    currency: string;
    active_sequences: number;
    monthly_collections: {
      monthly_limit: number;
      monthly_used: number;
      monthly_remaining: number;
      cap_reached: boolean;
    } | null;
  } | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; body: string; read: boolean }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [onboardingNote, setOnboardingNote] = useState<string | null>(null);

  useEffect(() => {
    const note = sessionStorage.getItem("onboarding_note");
    if (note) {
      setOnboardingNote(note);
      sessionStorage.removeItem("onboarding_note");
    }
  }, []);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [s, inv, notes] = await Promise.all([
        api.invoicesSummary(token),
        api.invoices(token),
        api.notifications(token),
      ]);
      setSummary(s);
      setInvoices(inv.items);
      setNotifications(notes.items.slice(0, 3));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user && !isOnboardingComplete(user)) {
      router.replace("/onboarding");
    }
  }, [user, router]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (loading || !user) {
    return <div className="flex min-h-full items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="min-h-full bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            Gentle<span className="text-accent">Tap</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/dashboard/escalations" className="text-muted hover:text-foreground">
              Needs you
            </Link>
            <Link href="/settings/connections" className="text-muted hover:text-foreground">
              Connections
            </Link>
            <Link href="/settings/billing" className="capitalize text-accent hover:underline">
              {planLabel(user.plan)}
            </Link>
            <span className="text-muted">{user.email}</span>
            <button onClick={logout} className="text-muted hover:text-foreground">
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="mt-1 text-muted">Green · yellow · red — your invoices at a glance</p>
          </div>
          {summary && (
            <p className="text-lg font-semibold">
              {formatMoney(summary.total_outstanding, summary.currency)}{" "}
              <span className="text-sm font-normal text-muted">outstanding</span>
            </p>
          )}
        </div>

        {onboardingNote && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {onboardingNote}
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "On track", count: summary?.green_count ?? 0, color: "bg-green/15 text-green" },
            {
              label: "Being followed up",
              count: summary?.yellow_count ?? 0,
              color: "bg-yellow/20 text-yellow",
            },
            { label: "Needs you", count: summary?.red_count ?? 0, color: "bg-red/15 text-red" },
          ].map((s) => (
            <div key={s.label} className="card">
              {s.label === "Needs you" && (summary?.red_count ?? 0) > 0 ? (
                <Link
                  href="/dashboard/escalations"
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.color} hover:opacity-80`}
                >
                  {s.label}
                </Link>
              ) : (
                <p className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                  {s.label}
                </p>
              )}
              <p className="mt-3 text-3xl font-bold">{s.count}</p>
            </div>
          ))}
        </div>

        {notifications.length > 0 && (
          <div className="card mt-8 space-y-3">
            <h2 className="font-semibold">Recent activity</h2>
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`rounded-lg p-3 text-sm ${n.read ? "bg-background" : "bg-accent/5 border border-accent/20"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.read && (
                    <button
                      className="shrink-0 text-xs text-accent hover:underline"
                      onClick={async () => {
                        const token = getToken();
                        if (!token) return;
                        await api.markNotificationRead(token, n.id);
                        await load();
                      }}
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className="text-muted">{n.body}</p>
              </div>
            ))}
          </div>
        )}

        {summary?.monthly_collections?.cap_reached && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Monthly collection limit reached ({summary.monthly_collections.monthly_used} /{" "}
            {summary.monthly_collections.monthly_limit}).{" "}
            <Link href="/settings/billing" className="font-medium underline">
              Upgrade to Pro
            </Link>{" "}
            for unlimited collections.
          </p>
        )}

        <div className="card mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Invoices</h2>
            <span className="text-sm text-muted">
              {user.plan === "free" && summary?.monthly_collections ? (
                <>
                  {summary.monthly_collections.monthly_used} / {summary.monthly_collections.monthly_limit}{" "}
                  collections this month
                </>
              ) : (
                <>{summary?.active_sequences ?? 0} active sequences</>
              )}
            </span>
          </div>
          {invoices.length === 0 ? (
            <div className="py-8 text-center text-muted">
              <p className="font-medium text-foreground">No invoices yet</p>
              <p className="mt-2 text-sm">Connect QuickBooks to import unpaid invoices.</p>
              <Link href="/onboarding" className="btn-primary mt-6 inline-flex">
                Complete setup
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-2 pr-4">Invoice</th>
                    <th className="pb-2 pr-4">Client</th>
                    <th className="pb-2 pr-4">Balance</th>
                    <th className="pb-2 pr-4">Overdue</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-border/60">
                      <td className="py-3 pr-4 font-medium">
                        <Link
                          href={`/dashboard/invoices/${inv.id}`}
                          className="hover:text-accent hover:underline"
                        >
                          #{inv.doc_number ?? "—"}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{inv.client_name}</td>
                      <td className="py-3 pr-4">
                        {formatMoney(inv.balance, inv.currency)}
                      </td>
                      <td className="py-3 pr-4">
                        {inv.days_overdue > 0 ? `${inv.days_overdue}d` : "—"}
                      </td>
                      <td className="py-3 pr-4 capitalize">{inv.status}</td>
                      <td className="py-3">
                        {inv.sequence_active && !inv.sequence_paused ? (
                          <button
                            className="text-xs text-muted hover:text-foreground"
                            onClick={async () => {
                              const token = getToken();
                              if (!token) return;
                              try {
                                await api.pauseInvoice(token, inv.id);
                                await load();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Could not pause");
                              }
                            }}
                          >
                            Pause
                          </button>
                        ) : inv.sequence_paused ? (
                          <button
                            className="text-xs text-accent hover:underline"
                            onClick={async () => {
                              const token = getToken();
                              if (!token) return;
                              try {
                                await api.resumeInvoice(token, inv.id);
                                await load();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Could not resume");
                              }
                            }}
                          >
                            Resume
                          </button>
                        ) : !inv.sequence_active ? (
                          <button
                            className="text-xs text-accent hover:underline"
                            onClick={async () => {
                              const token = getToken();
                              if (!token) return;
                              try {
                                await api.approveInvoice(token, inv.id);
                                await load();
                              } catch (err) {
                                setError(err instanceof Error ? err.message : "Could not activate");
                              }
                            }}
                          >
                            Activate
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
