"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm text-accent hover:underline">
            ← Dashboard
          </Link>
          <span className="text-sm text-muted">{user.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-2xl font-bold">Needs you</h1>
        <p className="mt-1 text-muted">
          Invoices where a human touch may work better than another automated reminder.
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {items.length === 0 ? (
          <div className="card mt-8 py-8 text-center text-muted">
            <p className="font-medium text-foreground">Nothing urgent right now</p>
            <p className="mt-2 text-sm">GentleTap will flag invoices here when escalation is recommended.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-4">
            {items.map((item) => (
              <li key={item.invoice_id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/dashboard/invoices/${item.invoice_id}`}
                      className="font-semibold text-accent hover:underline"
                    >
                      Invoice #{item.doc_number ?? "—"} · {item.client_name}
                    </Link>
                    <p className="mt-1 text-sm text-muted">
                      ${item.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ·{" "}
                      {item.days_overdue}d overdue
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-sm">{item.recommendation}</p>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
