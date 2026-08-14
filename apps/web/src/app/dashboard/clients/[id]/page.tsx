"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, type ClientDetail } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { riskBadgeClass } from "@/lib/dashboard-ui";
import { formatMoney, isOnboardingComplete } from "@/lib/onboarding";
import { hasWhatsapp } from "@/lib/pricing";

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const row = await api.clientDetail(id);
      setClient(row);
      setEditEmail(row.email ?? "");
      setEditPhone(row.phone ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client not found");
    }
  }, [id]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  useEffect(() => {
    if (user && !isOnboardingComplete(user)) router.replace("/onboarding");
  }, [user, router]);
  useEffect(() => {
    if (user) void Promise.resolve().then(() => load());
  }, [user, load]);

  async function saveContact(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !user) return;
    setSaveBusy(true);
    setError(null);
    setSaved(false);
    try {
      await api.updateClient(client.id, {
        email: editEmail.trim() || undefined,
        ...(hasWhatsapp(user.plan) ? { phone: editPhone.trim() || undefined } : {}),
      });
      setSaved(true);
      await load();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaveBusy(false);
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

  if (error || !client) {
    return (
      <DashboardShell>
        <div className="px-6 py-12 text-center">
          <p className="text-red">{error ?? "Client not found"}</p>
          <Link href="/dashboard/clients" className="mt-4 inline-block text-sm text-accent underline">
            ← Back to clients
          </Link>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="px-3.5 py-5 sm:px-5 lg:px-6 lg:py-5">
        <Link href="/dashboard/clients" className="text-xs text-muted hover:text-foreground">
          ← Clients
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{client.name}</h1>
            <p className="mt-0.5 text-sm text-muted">{client.email ?? "No email on file"}</p>
            {client.phone && <p className="text-sm text-muted">{client.phone}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${riskBadgeClass(client.risk_level)}`}
            >
              {client.risk_level} risk
            </span>
            <button
              type="button"
              onClick={() => void api.exportClientData(client.id).catch(() => setError("Export failed"))}
              className="text-xs text-muted underline hover:text-foreground"
            >
              Export client data
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] text-muted">Outstanding</p>
            <p className="mt-1 text-xl font-bold">{formatMoney(client.outstanding)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] text-muted">Lifetime value</p>
            <p className="mt-1 text-xl font-bold">{formatMoney(client.lifetime_value)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] text-muted">Avg days to pay</p>
            <p className="mt-1 text-xl font-bold">
              {client.avg_days_to_pay != null ? `${client.avg_days_to_pay}d` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-[11px] text-muted">Late payment rate</p>
            <p className="mt-1 text-xl font-bold">{Math.round(client.late_payment_rate * 100)}%</p>
          </div>
        </div>

        <div className="card mt-5">
          <h2 className="text-sm font-semibold">Contact details</h2>
          <p className="mt-1 text-xs text-muted">
            {hasWhatsapp(user.plan)
              ? "Default client email. Add WhatsApp numbers per invoice on the invoice page."
              : "Default client email for reminders."}
          </p>
          <form onSubmit={saveContact} className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className={hasWhatsapp(user.plan) ? "" : "sm:col-span-2"}>
              <label className="mb-1 block text-xs text-muted">Email</label>
              <input type="email" className="input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            </div>
            {hasWhatsapp(user.plan) && (
              <div>
                <label className="mb-1 block text-xs text-muted">Phone (optional)</label>
                <input
                  type="tel"
                  className="input"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                />
              </div>
            )}
            <div className="flex items-center gap-2 sm:col-span-2">
              <button type="submit" className="btn-primary py-1.5 text-xs" disabled={saveBusy}>
                {saveBusy ? "Saving…" : "Save contact"}
              </button>
              {saved && <span className="text-xs text-green">✓ Saved</span>}
            </div>
          </form>
        </div>

        <div className="card mt-5">
          <h2 className="text-sm font-semibold">Automation controls</h2>
          <p className="mt-1 text-xs text-muted">
            Override the account defaults for this client only.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 sm:col-span-2">
              <span>
                <span className="block text-sm font-medium">Do not contact</span>
                <span className="text-xs text-muted">Suppress all automated reminders for this client.</span>
              </span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-accent"
                checked={client.do_not_contact ?? false}
                onChange={async (e) => {
                  await api.updateClient(client.id, { do_not_contact: e.target.checked });
                  await load();
                }}
              />
            </label>

            <div>
              <label className="mb-1 block text-xs text-muted">Channel override</label>
              <select
                className="input"
                value={client.channel_override ?? ""}
                onChange={async (e) => {
                  const value = (e.target.value || null) as
                    | "email"
                    | "whatsapp"
                    | "both"
                    | "off"
                    | null;
                  await api.updateClient(client.id, { channel_override: value });
                  await load();
                }}
              >
                <option value="">Account default</option>
                <option value="email">Email only</option>
                <option value="whatsapp">WhatsApp only</option>
                <option value="both">Email + WhatsApp</option>
                <option value="off">Off</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted">Client timezone (optional)</label>
              <input
                className="input"
                placeholder="e.g. Europe/London"
                defaultValue={client.timezone ?? ""}
                onBlur={async (e) => {
                  const value = e.target.value.trim() || null;
                  if (value !== (client.timezone ?? null)) {
                    await api.updateClient(client.id, { timezone: value });
                    await load();
                  }
                }}
              />
            </div>
          </div>
        </div>

        <div className="card mt-5">
          <h2 className="text-sm font-semibold">Profile</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">Preferred channel</dt>
              <dd className="capitalize">{client.preferred_channel}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Tenure</dt>
              <dd>{client.tenure_months} months</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Paid on time</dt>
              <dd>{client.invoices_paid_on_time} invoices</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Paid late</dt>
              <dd>{client.invoices_paid_late} invoices</dd>
            </div>
            {client.email_suppressed && (
              <div className="sm:col-span-2">
                <p className="rounded-lg bg-yellow/10 px-3 py-2 text-xs text-yellow-900">
                  {hasWhatsapp(user.plan)
                    ? "Email suppressed — reminders will use WhatsApp or skip email."
                    : "Email suppressed — reminders may be skipped until email is restored."}
                </p>
              </div>
            )}
          </dl>
        </div>

        <div className="card mt-5">
          <h2 className="text-sm font-semibold">Invoices</h2>
          {client.invoices.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No invoices for this client.</p>
          ) : (
            <div className="mt-3 divide-y divide-border/60">
              {client.invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/dashboard/invoices/${inv.id}`}
                  className="flex items-center justify-between py-2.5 hover:text-accent"
                >
                  <div>
                    <p className="text-sm font-medium">#{inv.doc_number ?? "—"}</p>
                    <p className="text-[11px] text-muted">
                      {inv.days_overdue > 0 ? `${inv.days_overdue}d overdue` : "Current"}
                      {inv.sequence_active ? " · Autopilot running" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums">{formatMoney(inv.balance, inv.currency)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
