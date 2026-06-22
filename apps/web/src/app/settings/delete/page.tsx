"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, clearToken, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function DeleteAccountSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  if (!user) return null;

  async function downloadData() {
    const token = getToken();
    if (!token) return;
    setExportBusy(true);
    setExportError(null);
    try {
      await api.exportAccountData(token);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not export data");
    } finally {
      setExportBusy(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    if (deleteConfirm.trim().toUpperCase() !== "DELETE") {
      setDeleteError("Type DELETE in the box below to confirm.");
      return;
    }
    if (!window.confirm("Permanently delete your account and all data? This cannot be undone.")) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(token, deleteConfirm.trim());
      clearToken();
      router.replace("/?deleted=1");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Could not delete account");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold">Download your data</h2>
        <p className="mt-1 text-sm text-muted">
          Export a JSON copy of your profile, clients, invoices, and reminder history.
        </p>
        <button
          type="button"
          className="btn-secondary mt-4 py-2 text-sm disabled:opacity-60"
          onClick={downloadData}
          disabled={exportBusy}
        >
          {exportBusy ? "Preparing…" : "Download my data"}
        </button>
        {exportError && (
          <p className="mt-3 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{exportError}</p>
        )}
      </div>

      <div className="card border-red/20">
        <h2 className="font-semibold text-red">Delete account</h2>
        <p className="mt-1 text-sm text-muted">
          Permanently removes your profile, invoices, clients, reminders, and integration tokens. Cancel any
          active subscription in billing first.
        </p>
        <form onSubmit={deleteAccount} className="mt-4 space-y-3">
          <p className="text-xs text-muted">
            Type <strong className="text-foreground">DELETE</strong> to confirm.
          </p>
          <input
            className="input max-w-xs"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
          {deleteError && (
            <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{deleteError}</p>
          )}
          <button
            type="submit"
            disabled={deleteBusy || deleteConfirm.trim().toUpperCase() !== "DELETE"}
            className="rounded-full border border-red/40 bg-red/5 px-5 py-2 text-sm font-medium text-red transition hover:bg-red/10 disabled:opacity-50"
          >
            {deleteBusy ? "Deleting…" : "Permanently delete account"}
          </button>
        </form>
      </div>
    </div>
  );
}
