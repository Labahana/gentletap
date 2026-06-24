"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin-shell";
import { api, getToken } from "@/lib/api";

const STATUSES = ["failed", "stuck", "pending", "processing"] as const;

export default function AdminJobsPageInner() {
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") || "failed") as (typeof STATUSES)[number];
  const [data, setData] = useState<Awaited<ReturnType<typeof api.adminJobs>> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setData(await api.adminJobs(token, status));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load jobs");
    }
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function requeue(jobId: string) {
    const token = getToken();
    if (!token) return;
    if (!confirm(`Requeue job ${jobId}?`)) return;
    const result = await api.adminRequeueJob(token, jobId);
    setMsg(`Job ${jobId}: ${result.status}`);
    await load();
  }

  return (
    <AdminShell>
      <h1 className="text-xl font-semibold text-white">Reminder jobs</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/jobs?status=${s}`}
            className={`rounded-md px-3 py-1 text-sm ${
              status === s ? "bg-slate-700 text-white" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {msg && <p className="mt-4 text-sm text-amber-300">{msg}</p>}

      {data && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Step</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((j) => (
                <tr key={j.job_id} className="border-t border-slate-800">
                  <td className="px-3 py-2 font-mono text-xs text-slate-300">{j.job_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/users/${j.user_id}`} className="text-amber-400 hover:underline">
                      {j.user_email}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{j.doc_number || j.invoice_id.slice(0, 8)}</td>
                  <td className="px-3 py-2">
                    {j.status}
                    {j.stuck && <span className="ml-1 text-amber-400">(stuck)</span>}
                  </td>
                  <td className="px-3 py-2">{j.sequence_step}</td>
                  <td className="px-3 py-2">
                    {(j.status === "failed" || j.stuck) && (
                      <button
                        type="button"
                        onClick={() => void requeue(j.job_id)}
                        className="text-xs text-amber-400 hover:underline"
                      >
                        Requeue
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                    No jobs in this category
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
