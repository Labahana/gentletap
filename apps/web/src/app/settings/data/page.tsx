"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DataPrivacyPage() {
  const { user } = useAuth();
  const [retentionDays, setRetentionDays] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/v1/privacy/retention", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { retention: { delete_paid_after_days: number | null } };
        setRetentionDays(data.retention.delete_paid_after_days?.toString() ?? "");
      }
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  if (!user) return null;

  async function saveRetention(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/v1/privacy/retention", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delete_paid_after_days: retentionDays === "" ? null : Number(retentionDays),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function exportAccount() {
    setExporting(true);
    try {
      await api.exportAccountData();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold">Data & privacy</h2>
        <p className="mt-1 text-sm text-muted">
          Export your data, control how long paid invoices are kept, and manage client-level exports.
        </p>

        <div className="mt-4 divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium">Export my data</p>
              <p className="mt-0.5 text-xs text-muted">Full account export as JSON.</p>
            </div>
            <button
              type="button"
              onClick={exportAccount}
              disabled={exporting}
              className="btn-secondary py-2 text-sm disabled:opacity-60"
            >
              {exporting ? "Preparing…" : "Download JSON"}
            </button>
          </div>

          <form onSubmit={saveRetention} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium">Auto-delete paid invoices</p>
              <p className="mt-0.5 text-xs text-muted">
                Remove paid invoice records after this many days. Leave blank to keep everything.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={30}
                max={3650}
                className="input w-28"
                placeholder="Never"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
              />
              <button type="submit" disabled={saving} className="btn-primary py-2 text-sm disabled:opacity-60">
                {saving ? "Saving…" : "Save"}
              </button>
              {saved && <span className="text-xs text-green">✓</span>}
            </div>
          </form>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold">Client data</h3>
        <p className="mt-1 text-sm text-muted">
          To export a single client’s invoices and reminders, open the client from{" "}
          <Link href="/dashboard/clients" className="font-medium text-accent hover:underline">
            Clients
          </Link>{" "}
          and use “Export client data”.
        </p>
      </div>
    </div>
  );
}
