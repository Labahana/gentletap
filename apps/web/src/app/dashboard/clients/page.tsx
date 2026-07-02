"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, type ClientListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { riskBadgeClass } from "@/lib/dashboard-ui";
import { formatMoney, isOnboardingComplete } from "@/lib/onboarding";

export default function ClientsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [unreadAlerts, setUnreadAlerts] = useState(0);

  const load = useCallback(async () => {
    try {
      const [data, summary, notes] = await Promise.all([
        api.clients(),
        api.invoicesSummary(),
        api.notifications(),
      ]);
      setClients(data.items);
      setCurrency(summary.currency);
      setUnreadAlerts(notes.items.filter((n) => !n.read).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load clients");
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

  const q = search.trim().toLowerCase();
  const filtered = q
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email?.toLowerCase().includes(q) ?? false),
      )
    : clients;

  const totalOutstanding = clients.reduce((s, c) => s + c.outstanding, 0);

  return (
    <DashboardShell alertCount={unreadAlerts}>
      <div className="px-3.5 py-5 sm:px-5 lg:px-6 lg:py-5">
        <h1 className="text-base font-medium lg:text-[16px]">Clients</h1>
        <p className="mt-0.5 text-[11px] text-muted">
          {clients.length} clients · {formatMoney(totalOutstanding, currency)} outstanding
        </p>

        <input
          type="search"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input mt-4 text-sm"
        />

        {error && (
          <div className="mt-4 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">{error}</div>
        )}

        <div className="mt-4">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted">
              {clients.length === 0
                ? "No clients yet — connect QuickBooks to import customers."
                : "No clients match your search."}
            </p>
          ) : (
            <div className="card !p-0 divide-y divide-border/60 overflow-hidden">
              {filtered.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/clients/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-background/50 transition-colors"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-semibold text-accent">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {c.email ?? "No email"}
                      {c.avg_days_to_pay != null ? ` · pays in ${c.avg_days_to_pay}d avg` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {c.outstanding > 0 ? (
                      <p className="text-sm font-medium tabular-nums">{formatMoney(c.outstanding, currency)}</p>
                    ) : (
                      <p className="text-sm text-muted">—</p>
                    )}
                    <span
                      className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${riskBadgeClass(c.risk_level)}`}
                    >
                      {c.risk_level} risk
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
