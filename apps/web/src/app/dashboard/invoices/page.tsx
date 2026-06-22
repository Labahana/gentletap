"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { FilterChips, InvoiceMobileCard, InvoiceOverviewRow } from "@/components/dashboard-parts";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getToken, type InvoiceItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { filterCounts, filterInvoices, type InvoiceFilter } from "@/lib/dashboard-ui";
import { formatMoney, isOnboardingComplete } from "@/lib/onboarding";

export default function InvoicesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [currency, setCurrency] = useState("USD");
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [monthlyUsed, setMonthlyUsed] = useState<number | undefined>();
  const [monthlyLimit, setMonthlyLimit] = useState<number | undefined>();

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [inv, summary, notes] = await Promise.all([
        api.invoices(token),
        api.invoicesSummary(token),
        api.notifications(token),
      ]);
      setInvoices(inv.items);
      setCurrency(summary.currency);
      setUnreadAlerts(notes.items.filter((n) => !n.read).length);
      setMonthlyUsed(summary.monthly_collections?.monthly_used);
      setMonthlyLimit(summary.monthly_collections?.monthly_limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
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

  const filtered = filterInvoices(invoices, filter);
  const counts = filterCounts(invoices);

  return (
    <DashboardShell alertCount={unreadAlerts} monthlyUsed={monthlyUsed} monthlyLimit={monthlyLimit}>
      <div className="px-3.5 py-5 sm:px-5 lg:px-6 lg:py-5">
        <h1 className="text-base font-medium lg:text-[16px]">Invoices</h1>

        {error && (
          <div className="mt-4 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">{error}</div>
        )}

        <div className="mt-3.5">
          <FilterChips value={filter} onChange={setFilter} counts={counts} />
        </div>

        <div className="mt-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted">
                {invoices.length === 0 ? (
                  <>
                    No invoices yet.{" "}
                    <Link href="/settings/integrations" className="text-accent underline">
                      Connect QuickBooks
                    </Link>
                  </>
                ) : (
                  "No invoices match this filter."
                )}
              </p>
            </div>
          ) : (
            <>
              <div className="lg:hidden">
                {filtered.map((inv) => (
                  <InvoiceMobileCard key={inv.id} inv={inv} />
                ))}
              </div>
              <div className="card hidden !p-4 lg:block">
                {filtered.map((inv) => (
                  <InvoiceOverviewRow key={inv.id} inv={inv} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
