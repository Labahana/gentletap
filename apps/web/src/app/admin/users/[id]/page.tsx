"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  AdminAlert,
  AdminBadge,
  AdminButton,
  AdminEmpty,
  AdminLoading,
  AdminSection,
  AdminTable,
  connectionTone,
  formatAdminDate,
} from "@/components/admin/ui";
import { api, getToken } from "@/lib/api";
import type { AdminUserDetail } from "@/lib/admin-types";

function ConnectionCard({
  title,
  connected,
  rows,
}: {
  title: string;
  connected: boolean;
  rows: Array<{ label: string; value: string | null | undefined }>;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">{title}</h3>
        <AdminBadge tone={connectionTone(connected)}>{connected ? "Connected" : "Not connected"}</AdminBadge>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No connection on file</p>
      ) : (
        <dl className="space-y-1 text-sm">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex justify-between gap-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right text-slate-300">{value || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      setDetail(await api.adminUserDetail(token, userId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(
    label: string,
    fn: (token: string) => Promise<{ status: string } & Record<string, unknown>>,
  ) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`${label}?`)) return;
    setBusy(true);
    setActionMsg(null);
    try {
      const result = await fn(token);
      const extra =
        "invoices_paused" in result && result.invoices_paused != null
          ? ` (${result.invoices_paused} invoices, ${result.jobs_cancelled ?? 0} jobs cancelled)`
          : "";
      setActionMsg(`${label}: ${result.status}${extra}`);
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function requeueJob(jobId: string) {
    const token = getToken();
    if (!token) return;
    if (!confirm("Requeue this failed job?")) return;
    setBusy(true);
    try {
      const result = await api.adminRequeueJob(token, jobId);
      setActionMsg(`Job requeued: ${result.status}`);
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Requeue failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !detail) return <AdminLoading />;

  return (
    <>
      <Link href="/admin/users" className="text-sm text-slate-400 hover:text-slate-200">
        ← Users
      </Link>

      {error && (
        <div className="mt-4">
          <AdminAlert tone="error">{error}</AdminAlert>
        </div>
      )}
      {actionMsg && (
        <div className="mt-4">
          <AdminAlert tone="info">{actionMsg}</AdminAlert>
        </div>
      )}

      {detail && (
        <>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-white">{detail.email}</h1>
              <p className="mt-1 text-sm text-slate-400">
                {[detail.full_name, detail.company_name].filter(Boolean).join(" · ") || "No name on file"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <AdminBadge tone="accent">{detail.plan}</AdminBadge>
                <AdminBadge>{detail.onboarding_step}</AdminBadge>
                <AdminBadge tone={detail.delivery_ready ? "ok" : "warn"}>
                  {detail.delivery_ready ? "Delivery ready" : "Delivery not ready"}
                </AdminBadge>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                User ID {detail.id} · Joined {formatAdminDate(detail.created_at)}
                {detail.timezone ? ` · ${detail.timezone}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <AdminButton disabled={busy} onClick={() => void runAction("Force QuickBooks sync", (t) => api.adminSyncQb(t, userId))}>
                Force QB sync
              </AdminButton>
              <AdminButton
                variant="danger"
                disabled={busy}
                onClick={() => void runAction("Pause all reminders", (t) => api.adminPauseReminders(t, userId))}
              >
                Pause reminders
              </AdminButton>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-500">Unpaid invoices</p>
              <p className="text-2xl font-semibold text-white">{detail.stats.unpaid_invoices}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-500">Active sequences</p>
              <p className="text-2xl font-semibold text-white">{detail.stats.active_sequences}</p>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
              <p className="text-xs text-slate-500">Reminders sent</p>
              <p className="text-2xl font-semibold text-white">{detail.stats.reminders_sent}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ConnectionCard
              title="QuickBooks"
              connected={detail.quickbooks?.connected ?? false}
              rows={
                detail.quickbooks
                  ? [
                      { label: "Realm", value: detail.quickbooks.realm_id },
                      { label: "Last sync", value: formatAdminDate(detail.quickbooks.last_sync_at) },
                      { label: "Token expires", value: formatAdminDate(detail.quickbooks.token_expires_at) },
                      { label: "Connected", value: formatAdminDate(detail.quickbooks.connected_at) },
                    ]
                  : []
              }
            />
            <ConnectionCard
              title="Gmail"
              connected={detail.google?.connected ?? false}
              rows={
                detail.google
                  ? [
                      { label: "Email", value: detail.google.email },
                      { label: "Token expires", value: formatAdminDate(detail.google.token_expires_at) },
                      { label: "Connected", value: formatAdminDate(detail.google.connected_at) },
                    ]
                  : []
              }
            />
            <ConnectionCard
              title="WhatsApp"
              connected={detail.whatsapp?.connected ?? false}
              rows={
                detail.whatsapp
                  ? [
                      { label: "Phone", value: detail.whatsapp.phone_e164 },
                      { label: "Status", value: detail.whatsapp.status },
                      { label: "Connected", value: formatAdminDate(detail.whatsapp.connected_at) },
                    ]
                  : []
              }
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <AdminSection title="Recent QuickBooks syncs">
              {detail.recent_syncs.length === 0 ? (
                <AdminEmpty message="No sync history" />
              ) : (
                <AdminTable>
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Invoices</th>
                      <th className="px-3 py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recent_syncs.map((s, i) => (
                      <tr key={i} className="border-t border-slate-800">
                        <td className="px-3 py-2">
                          <AdminBadge tone={s.status === "success" ? "ok" : "warn"}>{s.status}</AdminBadge>
                          {s.message && <div className="mt-1 text-xs text-slate-500">{s.message}</div>}
                        </td>
                        <td className="px-3 py-2">{s.invoices_synced ?? "—"}</td>
                        <td className="px-3 py-2 text-slate-400">{formatAdminDate(s.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              )}
            </AdminSection>

            <AdminSection title="Recent failed jobs">
              {detail.recent_failed_jobs.length === 0 ? (
                <AdminEmpty message="No failed jobs" />
              ) : (
                <AdminTable>
                  <thead className="bg-slate-950 text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Step</th>
                      <th className="px-3 py-2">Updated</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recent_failed_jobs.map((j) => (
                      <tr key={j.job_id} className="border-t border-slate-800">
                        <td className="px-3 py-2">{j.doc_number || j.invoice_id.slice(0, 8)}</td>
                        <td className="px-3 py-2">{j.sequence_step}</td>
                        <td className="px-3 py-2 text-slate-400">{formatAdminDate(j.updated_at)}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void requeueJob(j.job_id)}
                            className="text-xs text-amber-400 hover:underline disabled:opacity-50"
                          >
                            Requeue
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </AdminTable>
              )}
            </AdminSection>
          </div>
        </>
      )}
    </>
  );
}
