"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, getToken, type InvoiceItem } from "@/lib/api";
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
  } | null>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [notifications, setNotifications] = useState<Array<{ title: string; body: string }>>([]);
  const [error, setError] = useState<string | null>(null);

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
              {summary.currency}{" "}
              {summary.total_outstanding.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-sm font-normal text-muted">outstanding</span>
            </p>
          )}
        </div>

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
              <p className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.color}`}>
                {s.label}
              </p>
              <p className="mt-3 text-3xl font-bold">{s.count}</p>
            </div>
          ))}
        </div>

        {notifications.length > 0 && (
          <div className="card mt-8 space-y-3">
            <h2 className="font-semibold">Recent activity</h2>
            {notifications.map((n, i) => (
              <div key={i} className="rounded-lg bg-background p-3 text-sm">
                <p className="font-medium">{n.title}</p>
                <p className="text-muted">{n.body}</p>
              </div>
            ))}
          </div>
        )}

        <div className="card mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Invoices</h2>
            <span className="text-sm text-muted">
              {summary?.active_sequences ?? 0} active sequences
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
                        ${inv.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                              await api.pauseInvoice(token, inv.id);
                              load();
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
                              await api.resumeInvoice(token, inv.id);
                              load();
                            }}
                          >
                            Resume
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
