"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AdminAlert,
  AdminButton,
  AdminPageHeader,
  AdminSection,
  AdminStatCard,
  AdminTable,
  AdminBadge,
  formatAdminDate,
  AdminLoading,
} from "@/components/admin/ui";
import { api } from "@/lib/api";
import type { AdminOverview } from "@/lib/admin-types";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [health, setHealth] = useState<Awaited<ReturnType<typeof api.adminHealth>> | null>(null);
  const [requeueMsg, setRequeueMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, h] = await Promise.all([api.adminOverview(), api.adminHealth()]);
      setOverview(o);
      setHealth(h);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function requeueStuck() {
    if (!confirm("Requeue all stuck reminder jobs (processing > 15 min)?")) return;
    const result = await api.adminRequeueStuck();
    setRequeueMsg(`Requeued ${result.requeued} stuck job(s)`);
    await load();
  }

  if (loading && !overview) return <AdminLoading />;

  return (
    <>
      <AdminPageHeader
        title="Platform overview"
        description="Live metrics across users, reminders, and infrastructure"
        actions={
          <>
            <AdminButton onClick={() => void load()}>Refresh</AdminButton>
            <AdminButton variant="primary" onClick={() => void requeueStuck()}>
              Requeue stuck jobs
            </AdminButton>
          </>
        }
      />

      {error && <AdminAlert tone="error">{error}</AdminAlert>}
      {requeueMsg && <AdminAlert tone="success">{requeueMsg}</AdminAlert>}

      {overview && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard label="Total users" value={overview.total_users} href="/admin/users" />
          <AdminStatCard label="Live users" value={overview.live_users} />
          <AdminStatCard label="Reminders today" value={overview.reminders_sent_today} />
          <AdminStatCard label="Active sequences" value={overview.active_sequences} />
          <AdminStatCard label="Pending jobs" value={overview.pending_jobs} href="/admin/jobs?status=pending" />
          <AdminStatCard label="Processing" value={overview.processing_jobs} href="/admin/jobs?status=processing" />
          <AdminStatCard
            label="Stuck jobs"
            value={overview.stuck_jobs}
            warn={overview.stuck_jobs > 0}
            href="/admin/jobs?status=stuck"
          />
          <AdminStatCard
            label="Failed jobs"
            value={overview.failed_jobs}
            warn={overview.failed_jobs > 0}
            href="/admin/jobs?status=failed"
          />
          <AdminStatCard label="QB connected" value={overview.qb_connected} />
          <AdminStatCard label="FB connected" value={overview.fb_connected} />
          <AdminStatCard label="Gmail connected" value={overview.google_connected} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {health && (
          <AdminSection title="System health">
            <ul className="space-y-2 text-sm">
              {Object.entries(health.checks).map(([key, val]) => (
                <li key={key} className="flex items-center justify-between gap-4">
                  <span className="text-slate-400">{key.replace(/_/g, " ")}</span>
                  <AdminBadge tone={val === "ok" ? "ok" : "warn"}>{val}</AdminBadge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-slate-500">Overall: {health.status}</p>
          </AdminSection>
        )}

        {overview && overview.recent_signups.length > 0 && (
          <AdminSection title="Recent signups">
            <AdminTable>
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Plan</th>
                  <th className="px-3 py-2">Step</th>
                  <th className="px-3 py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {overview.recent_signups.map((u) => (
                  <tr key={u.id} className="border-t border-slate-800">
                    <td className="px-3 py-2">
                      <Link href={`/admin/users/${u.id}`} className="text-amber-400 hover:underline">
                        {u.email}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{u.plan}</td>
                    <td className="px-3 py-2">{u.onboarding_step}</td>
                    <td className="px-3 py-2 text-slate-400">{formatAdminDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          </AdminSection>
        )}
      </div>
    </>
  );
}
