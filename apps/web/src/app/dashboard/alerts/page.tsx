"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DashIcon } from "@/components/dashboard-icons";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { alertCardStyle, formatActivityTime } from "@/lib/dashboard-ui";
import { formatMoney, isOnboardingComplete } from "@/lib/onboarding";

type AlertItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  invoice_id: string | null;
  read: boolean;
  source: "notification" | "escalation";
  balance?: number;
  created_at?: string;
};

export default function AlertsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<AlertItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [monthlyUsed, setMonthlyUsed] = useState<number | undefined>();
  const [monthlyLimit, setMonthlyLimit] = useState<number | undefined>();

  const load = useCallback(async () => {
    try {
      const [notes, esc, summary] = await Promise.all([
        api.notifications(),
        api.escalations(),
        api.invoicesSummary(),
      ]);
      setMonthlyUsed(summary.monthly_collections?.monthly_used);
      setMonthlyLimit(summary.monthly_collections?.monthly_limit);

      const merged: AlertItem[] = [
        ...esc.items.map((e) => ({
          id: `esc-${e.invoice_id}`,
          kind: "escalation",
          title: `${e.client_name} — final notice sent`,
          body: e.recommendation,
          invoice_id: e.invoice_id,
          read: false,
          source: "escalation" as const,
          balance: e.balance,
        })),
        ...notes.items.map((n) => ({
          id: n.id,
          kind: n.kind,
          title: n.title,
          body: n.body,
          invoice_id: n.invoice_id,
          read: n.read,
          source: "notification" as const,
          created_at: n.created_at ?? undefined,
        })),
      ];
      setItems(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
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

  const unreadCount = items.filter((i) => !i.read).length;

  async function markRead(id: string) {
    if (id.startsWith("esc-")) return;
    await api.markNotificationRead(id);
    await load();
  }

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
    <DashboardShell alertCount={unreadCount} monthlyUsed={monthlyUsed} monthlyLimit={monthlyLimit}>
      <div className="px-3.5 py-5 sm:px-5 lg:px-6 lg:py-5">
        <h1 className="text-base font-medium lg:text-[16px]">Alerts</h1>

        {error && (
          <div className="mt-4 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">{error}</div>
        )}

        {items.length === 0 ? (
          <div className="mt-8 py-16 text-center">
            <p className="text-2xl text-green">✓</p>
            <p className="mt-3 font-medium">All clear</p>
            <p className="mt-1 text-sm text-muted">GentleTap will notify you when something needs attention.</p>
          </div>
        ) : (
          <div className="mt-3.5 space-y-2">
            {items.map((item) => {
              const style = alertCardStyle(item.kind, item.source);
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border px-3 py-2.5 ${style.card}`}
                >
                  <div className={`flex items-center gap-1.5 ${style.text}`}>
                    <DashIcon
                      name={
                        item.kind === "payment_received" || item.kind === "payment"
                          ? "check"
                          : item.kind === "escalation"
                            ? "info"
                            : item.kind === "auto_activated"
                              ? "refresh"
                              : "mail"
                      }
                      size={14}
                    />
                    <p className="text-xs font-medium">{item.title}</p>
                  </div>
                  <p className={`mt-1 text-[11px] leading-relaxed ${style.text} opacity-90`}>{item.body}</p>
                  {item.balance != null && (
                    <p className={`mt-1 text-[11px] font-medium ${style.text}`}>
                      {formatMoney(item.balance)}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className={`text-[10px] ${style.text} opacity-70`}>
                      {item.created_at ? formatActivityTime(item.created_at) : ""}
                    </span>
                    <div className="flex gap-2">
                      {!item.read && item.source === "notification" && (
                        <button
                          type="button"
                          onClick={() => markRead(item.id)}
                          className={`text-[10px] underline ${style.text}`}
                        >
                          Dismiss
                        </button>
                      )}
                      {item.invoice_id && (
                        <Link
                          href={`/dashboard/invoices/${item.invoice_id}`}
                          className={`text-[10px] font-medium underline ${style.text}`}
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
