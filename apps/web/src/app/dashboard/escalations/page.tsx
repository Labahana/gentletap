"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getToken } from "@/lib/api";
import { formatMoney } from "@/lib/onboarding";
import { useAuth } from "@/lib/auth-context";

export default function EscalationsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<
    Array<{
      invoice_id: string;
      doc_number: string | null;
      client_name: string;
      balance: number;
      currency?: string;
      days_overdue: number;
      recommendation: string;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const data = await api.escalations(token);
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load escalations");
    }
  }, []);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (user) load(); }, [user, load]);

  if (loading || !user) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-40">
          <div className="h-6 w-32 animate-pulse rounded-xl bg-border" />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="px-8 py-8">
        <div>
          <h1 className="text-2xl font-bold">Needs you</h1>
          <p className="mt-1 text-sm text-muted">
            Invoices where a personal call or message will work better than another automated reminder.
          </p>
        </div>

        {error && (
          <p className="mt-6 rounded-xl border border-red/30 bg-red/5 px-5 py-3 text-sm text-red">{error}</p>
        )}

        {items.length === 0 ? (
          <div className="card mt-8 py-16 text-center">
            <p className="text-4xl">✓</p>
            <p className="mt-4 font-semibold text-lg">All clear</p>
            <p className="mt-1 text-sm text-muted">
              GentleTap will flag invoices here when escalation is recommended.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {items.map((item) => (
              <div key={item.invoice_id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/dashboard/invoices/${item.invoice_id}`}
                      className="font-semibold hover:text-accent hover:underline"
                    >
                      Invoice #{item.doc_number ?? "—"}
                    </Link>
                    <span className="ml-2 text-muted">·</span>
                    <span className="ml-2 text-sm">{item.client_name}</span>
                    <p className="mt-1 text-sm text-muted">
                      {formatMoney(item.balance, item.currency ?? "USD")} · {item.days_overdue}d overdue
                    </p>
                  </div>
                  <span className="rounded-full bg-red/10 px-3 py-1 text-xs font-medium text-red">
                    Escalation needed
                  </span>
                </div>
                <div className="mt-4 rounded-xl bg-background px-4 py-3 text-sm">
                  <p className="font-medium text-xs uppercase tracking-wide text-muted mb-1">AI recommendation</p>
                  {item.recommendation}
                </div>
                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/dashboard/invoices/${item.invoice_id}`}
                    className="btn-secondary py-1.5 text-xs"
                  >
                    View invoice →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
