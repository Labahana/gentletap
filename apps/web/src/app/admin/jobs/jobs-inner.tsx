"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AdminAlert,
  AdminBadge,
  AdminButton,
  AdminEmpty,
  AdminLoading,
  AdminPageHeader,
  AdminTable,
  formatAdminDate,
} from "@/components/admin/ui";
import { api, getToken } from "@/lib/api";
import type { AdminJob } from "@/lib/admin-types";

const STATUSES = ["failed", "stuck", "pending", "processing", "all"] as const;

export default function AdminJobsPageInner() {
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") || "failed") as (typeof STATUSES)[number];
  const [data, setData] = useState<{ items: AdminJob[]; status_filter: string; limit: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    try {
      setData(await api.adminJobs(token, status));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requeue(jobId: string) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Requeue job ${jobId.slice(0, 8)}…?`)) return;
    setBusyId(jobId);
    try {
      const result = await api.adminRequeueJob(token, jobId);
      setMsg(`Job ${jobId.slice(0, 8)}…: ${result.status}`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Requeue failed");
    } finally {
      setBusyId(null);
    }
  }

  async function requeueAllStuck() {
    const token = getToken();
    if (!token) return;
    if (!confirm("Requeue all stuck jobs?")) return;
    const result = await api.adminRequeueStuck(token);
    setMsg(`Requeued ${result.requeued} stuck job(s)`);
    await load();
  }

  return (
    <>
      <AdminPageHeader
        title="Reminder jobs"
        description="Inspect and recover stuck or failed reminder pipeline jobs"
        actions={
          status === "stuck" ? (
            <AdminButton variant="primary" onClick={() => void requeueAllStuck()}>
              Requeue all stuck
            </AdminButton>
          ) : (
            <AdminButton onClick={() => void load()}>Refresh</AdminButton>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/jobs?status=${s}`}
            className={`rounded-md px-3 py-1 text-sm capitalize ${
              status === s ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {error && <AdminAlert tone="error">{error}</AdminAlert>}
      {msg && <AdminAlert tone="info">{msg}</AdminAlert>}
      {loading && !data ? <AdminLoading /> : null}

      {data && (
        <>
          <AdminTable>
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Step</th>
                <th className="px-3 py-2">Scheduled</th>
                <th className="px-3 py-2">Updated</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((j) => (
                <tr key={j.job_id} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-mono text-xs text-slate-400" title={j.job_id}>
                    {j.job_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${j.user_id}`} className="text-amber-400 hover:underline">
                      {j.user_email}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{j.doc_number || j.invoice_id.slice(0, 8)}</td>
                  <td className="px-3 py-2">
                    <AdminBadge tone={j.status === "failed" || j.stuck ? "warn" : "neutral"}>
                      {j.status}
                      {j.stuck ? " (stuck)" : ""}
                    </AdminBadge>
                  </td>
                  <td className="px-3 py-2">{j.sequence_step}</td>
                  <td className="px-3 py-2 text-slate-400">{formatAdminDate(j.scheduled_for)}</td>
                  <td className="px-3 py-2 text-slate-400">{formatAdminDate(j.updated_at)}</td>
                  <td className="px-3 py-2">
                    {(j.status === "failed" || j.stuck) && (
                      <button
                        type="button"
                        disabled={busyId === j.job_id}
                        onClick={() => void requeue(j.job_id)}
                        className="text-xs text-amber-400 hover:underline disabled:opacity-50"
                      >
                        Requeue
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
          {data.items.length === 0 && <AdminEmpty message={`No ${status} jobs`} />}
          <p className="mt-3 text-xs text-slate-500">Showing up to {data.limit} most recent jobs</p>
        </>
      )}
    </>
  );
}
