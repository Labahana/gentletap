"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { hasWhatsapp } from "@/lib/pricing";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Awaited<ReturnType<typeof api.invoiceDetail>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualSaved, setManualSaved] = useState(false);
  const [editBalance, setEditBalance] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPaymentLink, setEditPaymentLink] = useState("");
  const [editReminderEmail, setEditReminderEmail] = useState("");
  const [editReminderPhone, setEditReminderPhone] = useState("");
  const [contactsBusy, setContactsBusy] = useState(false);
  const [contactsSaved, setContactsSaved] = useState(false);

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

  useEffect(() => {
    if (!invoice) return;
    setEditBalance(String(invoice.balance));
    setEditDueDate(invoice.due_date ?? "");
    setEditPaymentLink(invoice.payment_link ?? "");
    setEditReminderEmail(invoice.reminder_email ?? invoice.client.email ?? "");
    setEditReminderPhone(invoice.reminder_phone ?? invoice.effective_reminder_phone ?? "");
  }, [invoice]);

  async function markPaid() {
    const token = getToken();
    if (!token || !invoice) return;
    if (!window.confirm("Mark this invoice as paid? Reminders will stop.")) return;
    setManualBusy(true);
    setError(null);
    try {
      await api.markInvoicePaid(token, invoice.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark paid");
    } finally {
      setManualBusy(false);
    }
  }

  async function saveManualEdits(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !invoice) return;
    setManualBusy(true);
    setError(null);
    setManualSaved(false);
    try {
      await api.updateInvoice(token, invoice.id, {
        balance: parseFloat(editBalance),
        due_date: editDueDate || undefined,
        payment_link: editPaymentLink.trim() || undefined,
        clear_payment_link: !editPaymentLink.trim(),
      });
      setManualSaved(true);
      await load();
      setTimeout(() => setManualSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setManualBusy(false);
    }
  }

  async function saveContacts(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token || !invoice) return;
    setContactsBusy(true);
    setError(null);
    setContactsSaved(false);
    try {
      await api.updateInvoiceContacts(token, invoice.id, {
        client_email: editReminderEmail.trim() || undefined,
        reminder_phone: editReminderPhone.trim() || undefined,
        clear_reminder_phone: !editReminderPhone.trim(),
      });
      setContactsSaved(true);
      await load();
      setTimeout(() => setContactsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save contacts");
    } finally {
      setContactsBusy(false);
    }
  }

  async function startReminders() {
    const token = getToken();
    if (!token || !invoice) return;
    setManualBusy(true);
    setError(null);
    try {
      await api.approveInvoice(token, invoice.id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start reminders");
    } finally {
      setManualBusy(false);
    }
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
    <DashboardShell>
      <div className="mx-auto max-w-4xl px-8 py-8">
        <Link href="/dashboard/invoices" className="text-sm text-muted hover:text-foreground">
          ← Invoices
        </Link>
        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {invoice && (
          <>
            <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold">Invoice #{invoice.doc_number ?? "—"}</h1>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      (invoice.source ?? "quickbooks") === "upload"
                        ? "bg-amber-500/15 text-amber-900 dark:text-amber-100"
                        : "bg-green/15 text-green"
                    }`}
                  >
                    {invoice.source_label}
                  </span>
                </div>
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

            {(invoice.source ?? "quickbooks") === "upload" ? (
              <p className="mt-6 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50">
                <span className="font-medium">Uploaded invoice.</span> Balances don&apos;t sync from QuickBooks —
                re-upload your spreadsheet on the{" "}
                <Link href="/dashboard/invoices" className="font-medium text-accent hover:underline">
                  invoices page
                </Link>{" "}
                when this is paid or the amount changes.
              </p>
            ) : (
              <p className="mt-6 rounded-xl border border-green/25 bg-green/5 px-4 py-3 text-sm text-green">
                <span className="font-medium">QuickBooks invoice.</span> Balances and payments sync automatically
                every 30 minutes. Reminders stop when QuickBooks shows this invoice as paid.
              </p>
            )}

            {invoice.needs_attention && invoice.attention_label && (
              <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                {invoice.attention_label}
              </p>
            )}

            {(invoice.source ?? "quickbooks") === "upload" && invoice.balance > 0 && (
              <div className="card mt-6">
                <h2 className="font-semibold">Manage uploaded invoice</h2>
                <p className="mt-1 text-sm text-muted">
                  Update balance and due date here, or mark paid when the client pays.
                  {invoice.imported_at && (
                    <span className="block mt-1 text-xs">
                      Last imported {new Date(invoice.imported_at).toLocaleString()}
                      {invoice.last_manual_update_at &&
                        ` · Last edited ${new Date(invoice.last_manual_update_at).toLocaleString()}`}
                    </span>
                  )}
                </p>
                <form onSubmit={saveManualEdits} className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Balance</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input"
                      value={editBalance}
                      onChange={(e) => setEditBalance(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Due date</label>
                    <input
                      type="date"
                      className="input"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1.5 block text-sm font-medium">Payment link (optional)</label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://pay.stripe.com/..."
                      value={editPaymentLink}
                      onChange={(e) => setEditPaymentLink(e.target.value)}
                    />
                    <p className="mt-1 text-xs text-muted">Included in reminder emails for uploaded invoices.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <button type="submit" className="btn-primary" disabled={manualBusy}>
                      {manualBusy ? "Saving…" : "Save changes"}
                    </button>
                    <button type="button" className="btn-secondary" disabled={manualBusy} onClick={markPaid}>
                      Mark as paid
                    </button>
                    {!invoice.sequence_active && (invoice.reminder_email || invoice.client.email) && invoice.days_overdue > 0 && (
                      <button type="button" className="btn-secondary" disabled={manualBusy} onClick={startReminders}>
                        Start reminders
                      </button>
                    )}
                    {manualSaved && <span className="text-sm text-green">✓ Saved</span>}
                  </div>
                </form>
              </div>
            )}

            <div id="reminder-contacts" className="card mt-6">
              <h2 className="font-semibold">Reminder contacts</h2>
              <p className="mt-1 text-sm text-muted">
                Where reminders for this invoice are sent — email first, then WhatsApp on Pro+ (steps 1–3).
              </p>
              <form onSubmit={saveContacts} className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Email</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="client@company.com"
                    value={editReminderEmail}
                    onChange={(e) => setEditReminderEmail(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-muted">Required for email reminders.</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    WhatsApp number {user && hasWhatsapp(user.plan) ? "" : "(Pro+)"}
                  </label>
                  <input
                    type="tel"
                    className="input"
                    placeholder="+1 555 123 4567"
                    value={editReminderPhone}
                    onChange={(e) => setEditReminderPhone(e.target.value)}
                    disabled={!hasWhatsapp(user.plan)}
                  />
                  {hasWhatsapp(user.plan) ? (
                    <p className="mt-1 text-xs text-muted">
                      {invoice.whatsapp_phone_missing
                        ? "No number yet — WhatsApp follow-ups are skipped until you add one."
                        : "Follow-ups send after each email on steps 1–3."}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">
                      Upgrade to Pro+ to add WhatsApp follow-ups per invoice.{" "}
                      <Link href="/settings/profile" className="text-accent underline">
                        View plans
                      </Link>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <button type="submit" className="btn-primary" disabled={contactsBusy}>
                    {contactsBusy ? "Saving…" : "Save contacts"}
                  </button>
                  {contactsSaved && <span className="text-sm text-green">✓ Saved</span>}
                </div>
              </form>
            </div>

            <div className="card mt-6 grid gap-4 sm:grid-cols-2">
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
              {invoice.payment_link && invoice.balance > 0 && (
                <div className="sm:col-span-2">
                  <p className="text-xs uppercase text-muted">
                    {(invoice.source ?? "quickbooks") === "upload" ? "Payment link" : "QuickBooks pay link"}
                  </p>
                  <a
                    href={invoice.payment_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm font-medium text-accent hover:underline"
                  >
                    Open payment page →
                  </a>
                  <p className="mt-1 text-xs text-muted">
                    Included in reminder emails when available from QuickBooks.
                  </p>
                </div>
              )}
            </div>

            {invoice.client_claimed_paid_at && invoice.balance > 0 && (
              <p className="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                Client claims they paid ({new Date(invoice.client_claimed_paid_at).toLocaleString()}
                ).{" "}
                {(invoice.source ?? "quickbooks") === "upload"
                  ? "Mark as paid below, or set balance to zero when you save changes."
                  : "Reminders continue until QuickBooks shows this invoice as paid."}
              </p>
            )}

            {invoice.dispute_flag && (
              <p className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-900 dark:text-red-100">
                This invoice is marked as disputed — reminders are paused.
              </p>
            )}

            {!invoice.sequence_active && !invoice.dispute_flag && invoice.balance > 0 && invoice.days_overdue > 0 && (
              <p className="mt-6 rounded-xl border border-accent/25 bg-accent/5 px-4 py-3 text-sm">
                {!invoice.reminder_email && !invoice.client.email ? (
                  <>
                    <span className="font-medium">Client email missing.</span>{" "}
                    {(invoice.source ?? "quickbooks") === "upload"
                      ? "Add an email in Reminder contacts above, or re-upload your spreadsheet."
                      : "Add an email in QuickBooks — GentleTap will start reminders on the next sync."}
                  </>
                ) : (invoice.source ?? "quickbooks") === "upload" ? (
                  <>
                    <span className="font-medium">Turn on reminders.</span> Use Start reminders below once
                    balance and due date are correct.
                  </>
                ) : (
                  <>
                    <span className="font-medium">Reminders start automatically.</span> GentleTap picks this up on
                    the next QuickBooks sync (every 30 minutes). No action needed.
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
