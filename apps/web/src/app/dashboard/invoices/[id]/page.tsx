"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Awaited<ReturnType<typeof api.invoiceDetail>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token || !id) return;
    try {
      setInvoice(await api.invoiceDetail(token, id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    }
  }, [id]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

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

  return (
    <DashboardShell>
      <div className="mx-auto max-w-4xl px-8 py-8">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← Dashboard
        </Link>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {invoice && (
          <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Invoice #{invoice.doc_number ?? "—"}</h1>
                <p className="mt-1 text-muted">{invoice.client.name}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {invoice.currency}{" "}
                  {invoice.balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-sm capitalize text-muted">
                  {invoice.status}
                  {invoice.days_overdue > 0 ? ` · ${invoice.days_overdue}d overdue` : ""}
                </p>
              </div>
            </div>

            <div className="card mt-8 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-muted">Client email</p>
                <p>{invoice.client.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted">Client phone</p>
                <p>{invoice.client.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted">Sequence</p>
                <p>
                  Step {invoice.sequence_step}
                  {invoice.sequence_active
                    ? invoice.sequence_paused
                      ? " · paused"
                      : " · active"
                    : " · inactive"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted">Due date</p>
                <p>{invoice.due_date ?? "—"}</p>
              </div>
            </div>

            {invoice.client_claimed_paid_at && invoice.balance > 0 && (
              <p className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                Client claims they paid ({new Date(invoice.client_claimed_paid_at).toLocaleString()}
                ). Reminders continue until QuickBooks shows this invoice as paid.
              </p>
            )}

            {invoice.dispute_flag && (
              <p className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-100">
                This invoice is marked as disputed — reminders are paused.
              </p>
            )}

            {!invoice.sequence_active && !invoice.dispute_flag && invoice.balance > 0 && invoice.days_overdue > 0 && (
              <p className="mt-6 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm">
                {!invoice.client.email ? (
                  <>
                    <span className="font-medium">Client email missing.</span> Add an email in QuickBooks — GentleTap
                    will start reminders on the next sync.
                  </>
                ) : (
                  <>
                    <span className="font-medium">Reminders start automatically.</span> GentleTap picks this up on the
                    next QuickBooks sync (every 30 minutes). No action needed.
                  </>
                )}
              </p>
            )}

            {invoice.sequence_active && !invoice.sequence_paused && (
              <p className="mt-6 rounded-xl border border-green/30 bg-green/5 px-4 py-3 text-sm text-green">
                Reminder sequence is running automatically.
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              {invoice.sequence_active && !invoice.sequence_paused ? (
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    const token = getToken();
                    if (!token) return;
                    await api.pauseInvoice(token, invoice.id);
                    load();
                  }}
                >
                  Pause sequence
                </button>
              ) : invoice.sequence_paused ? (
                <button
                  className="btn-primary"
                  onClick={async () => {
                    const token = getToken();
                    if (!token) return;
                    await api.resumeInvoice(token, invoice.id);
                    load();
                  }}
                >
                  Resume sequence
                </button>
              ) : null}
              {!invoice.dispute_flag ? (
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    const token = getToken();
                    if (!token) return;
                    try {
                      await api.markDispute(token, invoice.id);
                      load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not mark dispute");
                    }
                  }}
                >
                  Mark disputed
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  onClick={async () => {
                    const token = getToken();
                    if (!token) return;
                    try {
                      await api.clearDispute(token, invoice.id);
                      load();
                    } catch (err) {
                      setError(err instanceof Error ? err.message : "Could not clear dispute");
                    }
                  }}
                >
                  Clear dispute
                </button>
              )}
            </div>

            <div className="card mt-8">
              <h2 className="font-semibold">Reminder history</h2>
              {invoice.reminders.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No reminders sent yet.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {invoice.reminders.map((r) => (
                    <li key={r.id} className="rounded-lg border border-border p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          Step {r.sequence_step} · {r.channel}
                        </span>
                        <span className="capitalize text-muted">{r.status}</span>
                      </div>
                      {r.subject && <p className="mt-2 font-medium">{r.subject}</p>}
                      <p className="mt-2 whitespace-pre-wrap text-muted">{r.body}</p>
                      {r.channel === "whatsapp" && (
                        <p className="mt-2 text-xs text-muted">Meta-approved WhatsApp template</p>
                      )}
                      {r.sent_at && (
                        <p className="mt-2 text-xs text-muted">
                          Sent {new Date(r.sent_at).toLocaleString()}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
