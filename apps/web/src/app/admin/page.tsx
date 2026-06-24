"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { api, getToken } from "@/lib/api";

function StatCard({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${warn ? "border-amber-500/40 bg-amber-500/5" : "border-slate-800 bg-slate-900"}`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof api.adminOverview>> | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof api.adminHealth>> | null>(null);
  const [requeueMsg, setRequeueMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [o, h] = await Promise.all([api.adminOverview(token), api.adminHealth(token)]);
      setOverview(o);
      setHealth(h);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function requeueStuck() {
    const token = getToken();
    if (!token) return;
    if (!confirm("Requeue all stuck reminder jobs (processing > 15 min)?")) return;
    const result = await api.adminRequeueStuck(token);
    setRequeueMsg(`Requeued ${result.requeued} stuck job(s)`);
    await load();
  }

  return (
    <AdminShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Platform overview</h1>
          <p className="text-sm text-slate-400">Read-only system metrics</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => void requeueStuck()}
            className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-500"
          >
            Requeue stuck jobs
          </button>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
      {requeueMsg && <p className="mb-4 text-sm text-amber-300">{requeueMsg}</p>}

      {overview && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total users" value={overview.total_users} />
          <StatCard label="Live users" value={overview.live_users} />
          <StatCard label="Reminders sent today" value={overview.reminders_sent_today} />
          <StatCard label="Active sequences" value={overview.active_sequences} />
          <StatCard label="Pending jobs" value={overview.pending_jobs} />
          <StatCard label="Processing" value={overview.processing_jobs} />
          <StatCard label="Stuck jobs" value={overview.stuck_jobs} warn={overview.stuck_jobs > 0} />
          <StatCard label="Failed jobs" value={overview.failed_jobs} warn={overview.failed_jobs > 0} />
          <StatCard label="QB connected" value={overview.qb_connected} />
          <StatCard label="Gmail connected" value={overview.google_connected} />
        </div>
      )}

      {health && (
        <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm font-medium text-slate-300">System health</h2>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(health.checks).map(([key, val]) => (
              <li key={key} className="flex justify-between gap-4">
                <span className="text-slate-400">{key}</span>
                <span className={val === "ok" ? "text-emerald-400" : "text-amber-400"}>{val}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/users" className="text-amber-400 hover:text-amber-300">
          Search users →
        </Link>
        <Link href="/admin/jobs?status=failed" className="text-amber-400 hover:text-amber-300">
          Failed jobs →
        </Link>
        <Link href="/admin/jobs?status=stuck" className="text-amber-400 hover:text-amber-300">
          Stuck jobs →
        </Link>
      </section>
    </AdminShell>
  );
}
