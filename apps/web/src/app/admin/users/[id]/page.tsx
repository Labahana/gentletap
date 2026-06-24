"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { api, getToken } from "@/lib/api";

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      setDetail(await api.adminUserDetail(token, userId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
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
      setActionMsg(`${label}: ${result.status}${"invoices_paused" in result ? ` (${result.invoices_paused} invoices)` : ""}`);
      await load();
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <Link href="/admin/users" className="text-sm text-slate-400 hover:text-slate-200">
        ← Users
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-white">User detail</h1>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {actionMsg && <p className="mt-4 text-sm text-amber-300">{actionMsg}</p>}

      {detail && (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("Force QuickBooks sync", (t) => api.adminSyncQb(t, userId))}
              className="rounded-md bg-slate-700 px-3 py-1.5 text-sm text-white hover:bg-slate-600 disabled:opacity-50"
            >
              Force QB sync
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction("Pause all reminders", (t) => api.adminPauseReminders(t, userId))}
              className="rounded-md border border-amber-600/50 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-600/10 disabled:opacity-50"
            >
              Pause reminders
            </button>
          </div>

          <pre className="mt-6 overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 p-4 text-xs text-slate-300">
            {JSON.stringify(detail, null, 2)}
          </pre>
        </>
      )}
    </AdminShell>
  );
}
