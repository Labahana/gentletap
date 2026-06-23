"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/lib/onboarding";
import { hasWhatsapp } from "@/lib/pricing";

type InvoiceDetail = Awaited<ReturnType<typeof api.invoiceDetail>>;

function statusPill(status: string, daysOverdue: number) {
  if (daysOverdue > 60) return "bg-red/10 text-red";
  if (daysOverdue > 0) return "bg-yellow/20 text-yellow-900";
  return "bg-green/10 text-green";
}

function sequenceLabel(invoice: InvoiceDetail) {
  if (!invoice.sequence_active) return "Not started";
  if (invoice.sequence_paused) return "Paused";
  return `Step ${invoice.sequence_step} · Active`;
}

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
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
      setError(null);
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
    setEditReminderPhone(invoice.reminder_phone ?? "");
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
    if (!token || !invoice || !user) return;
    setContactsBusy(true);
    setError(null);
    setContactsSaved(false);
    try {
      await api.updateInvoiceContacts(token, invoice.id, {
        client_email: editReminderEmail.trim() || undefined,
        ...(hasWhatsapp(user.plan)
          ? {
              reminder_phone: editReminderPhone.trim() || undefined,
              clear_reminder_phone: !editReminderPhone.trim(),
            }
          : {}),
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

  const isUpload = (invoice?.source ?? "quickbooks") === "upload";
  const hasEmail = Boolean(invoice?.reminder_email || invoice?.client.email);
  const whatsappPlan = hasWhatsapp(user.plan);

  return (
    <DashboardShell>
      <div className="px-3.5 py-5 sm:px-5 lg:px-6 lg:py-5">
        <Link
          href="/dashboard/invoices"
          className="text-[11px] text-muted hover:text-foreground"
        >
          ← Back to invoices
        </Link>

        {error && (
          <div className="mt-3 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">
            {error}
          </div>
        )}

        {invoice && (
          <div className="mt-4 space-y-4">
            {/* Hero */}
            <div className="card !p-4 sm:!p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-lg font-semibold sm:text-xl">
                      Invoice #{invoice.doc_number ?? "—"}
                    </h1>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isUpload
                          ? "bg-amber-500/15 text-amber-900"
                          : "bg-green/15 text-green"
                      }`}
                    >
                      {invoice.source_label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{invoice.client.name}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <span
                      className={`rounded-full px-2.5 py-1 font-medium ${statusPill(invoice.status, invoice.days_overdue)}`}
                    >
                      {invoice.days_overdue > 0
                        ? `${invoice.days_overdue} days overdue`
                        : invoice.status}
                    </span>
                    <span className="rounded-full bg-background px-2.5 py-1 text-muted">
                      Due {invoice.due_date ?? "—"}
                    </span>
                    <span className="rounded-full bg-background px-2.5 py-1 text-muted">
                      {sequenceLabel(invoice)}
                    </span>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-2xl font-bold tabular-nums sm:text-3xl">
                    {formatMoney(invoice.balance, invoice.currency)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    of {formatMoney(invoice.amount, invoice.currency)} total
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {invoice.sequence_active && !invoice.sequence_paused ? (
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
                    onClick={async () => {
                      const token = getToken();
                      if (!token) return;
                      await api.pauseInvoice(token, invoice.id);
                      load();
                    }}
                  >
                    Pause reminders
                  </button>
                ) : invoice.sequence_paused ? (
                  <button
                    type="button"
                    className="btn-primary py-1.5 px-4 text-xs"
                    onClick={async () => {
                      const token = getToken();
                      if (!token) return;
                      await api.resumeInvoice(token, invoice.id);
                      load();
                    }}
                  >
                    Resume reminders
                  </button>
                ) : null}
                {!invoice.dispute_flag ? (
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
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
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
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
                {isUpload && invoice.balance > 0 && (
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-background"
                    disabled={manualBusy}
                    onClick={markPaid}
                  >
                    Mark paid
                  </button>
                )}
              </div>
            </div>

            {/* Alerts */}
            {invoice.needs_attention && invoice.attention_label && (
              <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-2.5 text-sm text-amber-950">
                {invoice.attention_label}
              </div>
            )}
            {invoice.dispute_flag && (
              <div className="rounded-xl border border-red/30 bg-red/5 px-3.5 py-2.5 text-sm text-red">
                Reminders are paused while this invoice is disputed.
              </div>
            )}
            {invoice.sequence_active && !invoice.sequence_paused && (
              <div className="rounded-xl border border-green/30 bg-green/5 px-3.5 py-2.5 text-sm text-green">
                Autopilot is chasing this invoice.
              </div>
            )}
            {!invoice.sequence_active &&
              !invoice.dispute_flag &&
              invoice.balance > 0 &&
              invoice.days_overdue > 0 && (
                <div className="rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm">
                  {!hasEmail ? (
                    <span>Add a reminder email below to start chasing this invoice.</span>
                  ) : isUpload ? (
                    <span>
                      Re-upload your spreadsheet to start reminders automatically, or approve this invoice below.
                    </span>
                  ) : (
                    <span>QuickBooks sync will start reminders automatically on the next sync.</span>
                  )}
                </div>
              )}

            <div className="grid gap-4 lg:grid-cols-2">
              {/* Contacts */}
              <div id="reminder-contacts" className="card scroll-mt-20 !p-4">
                <h2 className="text-sm font-semibold">Reminder contacts</h2>
                <p className="mt-0.5 text-xs text-muted">Where email reminders for this invoice are sent.</p>
                <form onSubmit={saveContacts} className="mt-4 space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Client email</label>
                    <input
                      type="email"
                      className="input"
                      placeholder="client@company.com"
                      value={editReminderEmail}
                      onChange={(e) => setEditReminderEmail(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn-primary py-2 px-4 text-xs" disabled={contactsBusy}>
                    {contactsBusy ? "Saving…" : "Save email"}
                  </button>
                  {contactsSaved && <span className="ml-2 text-xs text-green">Saved</span>}
                </form>
              </div>

              {whatsappPlan ? (
                <div id="whatsapp-contacts" className="card scroll-mt-20 !p-4">
                  <h2 className="text-sm font-semibold">WhatsApp follow-up</h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Add the <span className="font-medium">client&apos;s</span> mobile for quick follow-ups after
                    email (steps 1–3). Not pulled from QuickBooks.
                  </p>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const token = getToken();
                      if (!token || !invoice) return;
                      setContactsBusy(true);
                      setError(null);
                      setContactsSaved(false);
                      try {
                        await api.updateInvoiceContacts(token, invoice.id, {
                          reminder_phone: editReminderPhone.trim() || undefined,
                          clear_reminder_phone: !editReminderPhone.trim(),
                        });
                        setContactsSaved(true);
                        await load();
                        setTimeout(() => setContactsSaved(false), 3000);
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Could not save WhatsApp number");
                      } finally {
                        setContactsBusy(false);
                      }
                    }}
                    className="mt-4 space-y-3"
                  >
                    <div>
                      <label className="mb-1 block text-xs font-medium text-muted">Client WhatsApp number</label>
                      <input
                        type="tel"
                        className="input"
                        placeholder="+1 555 123 4567"
                        value={editReminderPhone}
                        onChange={(e) => setEditReminderPhone(e.target.value)}
                      />
                      <p className="mt-1 text-[11px] text-muted">
                        {editReminderPhone
                          ? "Follow-ups send after each email on steps 1–3."
                          : "No number yet — WhatsApp nudges are skipped until you add one."}
                      </p>
                    </div>
                    <button type="submit" className="btn-primary py-2 px-4 text-xs" disabled={contactsBusy}>
                      {contactsBusy ? "Saving…" : "Save WhatsApp number"}
                    </button>
                    {contactsSaved && <span className="ml-2 text-xs text-green">Saved</span>}
                  </form>
                </div>
              ) : (
                <div className="card !p-4">
                  <h2 className="text-sm font-semibold">WhatsApp follow-up</h2>
                  <p className="mt-2 text-sm text-muted">
                    Pro+ and Team can add a client mobile number per invoice for WhatsApp nudges after email.
                  </p>
                  <Link href="/settings/profile" className="btn-primary mt-4 inline-flex py-2 px-4 text-xs">
                    Upgrade to Pro+
                  </Link>
                </div>
              )}

              {/* Details */}
              <div className="card !p-4">
                <h2 className="text-sm font-semibold">Details</h2>
                <dl className="mt-3 space-y-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted">Source</dt>
                    <dd className="font-medium">{invoice.source_label}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted">Due date</dt>
                    <dd className="font-medium">{invoice.due_date ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-border/50 pb-2">
                    <dt className="text-muted">Sequence</dt>
                    <dd className="font-medium">{sequenceLabel(invoice)}</dd>
                  </div>
                  {invoice.payment_link && invoice.balance > 0 && (
                    <div className="pt-1">
                      <dt className="text-muted">Payment</dt>
                      <dd className="mt-1">
                        <a
                          href={invoice.payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-accent hover:underline"
                        >
                          Open payment page →
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
                <p className="mt-4 text-[11px] leading-relaxed text-muted">
                  {isUpload
                    ? "Reminders run on autopilot. Update balance here when paid — QuickBooks won’t sync uploaded rows."
                    : "QuickBooks balances sync every 30 minutes. Reminders stop when QB shows paid."}
                </p>
              </div>
            </div>

            {/* Upload management */}
            {isUpload && invoice.balance > 0 && (
              <div className="card !p-4">
                <h2 className="text-sm font-semibold">Balance &amp; due date</h2>
                {invoice.imported_at && (
                  <p className="mt-0.5 text-[11px] text-muted">
                    Imported {new Date(invoice.imported_at).toLocaleString()}
                  </p>
                )}
                <form onSubmit={saveManualEdits} className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted">Balance</label>
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
                    <label className="mb-1 block text-xs font-medium text-muted">Due date</label>
                    <input
                      type="date"
                      className="input"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-muted">Payment link (optional)</label>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://pay.stripe.com/..."
                      value={editPaymentLink}
                      onChange={(e) => setEditPaymentLink(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <button type="submit" className="btn-secondary py-2 px-4 text-xs" disabled={manualBusy}>
                      {manualBusy ? "Saving…" : "Save balance"}
                    </button>
                    {!invoice.sequence_active && hasEmail && invoice.days_overdue > 0 && (
                      <button
                        type="button"
                        className="btn-primary py-2 px-4 text-xs"
                        disabled={manualBusy}
                        onClick={startReminders}
                      >
                        Start reminders
                      </button>
                    )}
                    {manualSaved && <span className="text-xs text-green">Saved</span>}
                  </div>
                </form>
              </div>
            )}

            {/* Reminder history */}
            <div className="card !p-4">
              <h2 className="text-sm font-semibold">Reminder history</h2>
              {invoice.reminders.length === 0 ? (
                <p className="mt-3 text-sm text-muted">No reminders sent yet.</p>
              ) : (
                <ul className="mt-3 divide-y divide-border/60">
                  {invoice.reminders.map((r) => (
                    <li key={r.id} className="py-3 first:pt-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Step {r.sequence_step} · <span className="capitalize">{r.channel}</span>
                        </p>
                        <span className="text-[11px] capitalize text-muted">{r.status}</span>
                      </div>
                      {r.subject && <p className="mt-1 text-sm">{r.subject}</p>}
                      <p className="mt-1 line-clamp-3 text-xs text-muted">{r.body}</p>
                      {r.sent_at && (
                        <p className="mt-1 text-[10px] text-muted">
                          {new Date(r.sent_at).toLocaleString()}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
