"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, clearToken, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PERSONAS = [
  { id: "freelancer", label: "Freelancer", icon: "💻", desc: "Independent contractor or solo worker" },
  { id: "consultant", label: "Consultant", icon: "📊", desc: "Advisory or professional services" },
  { id: "agency", label: "Agency", icon: "🏢", desc: "Team managing multiple clients" },
];

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 py-6 sm:flex-row sm:items-start sm:gap-8">
      <div className="sm:w-64 shrink-0">
        <p className="font-medium text-sm">{label}</p>
        {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [persona, setPersona] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? "");
      setPersona(user.persona ?? null);
    }
  }, [user]);

  if (loading || !user) {
    return (
      <DashboardShell>
        <div className="flex h-full items-center justify-center py-40">
          <div className="h-8 w-32 animate-pulse rounded-xl bg-border" />
        </div>
      </DashboardShell>
    );
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await api.updateProfile(token, { full_name: fullName, persona: persona ?? undefined });
      await refresh();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    const token = getToken();
    if (!token) return;
    setPwSaving(true);
    setPwError(null);
    setPwSaved(false);
    try {
      await api.changePassword(token, newPassword);
      setNewPassword("");
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setPwSaving(false);
    }
  }

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
      setDeleteError('Type DELETE in the box below to confirm.');
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
    <DashboardShell>
      <div className="mx-auto max-w-2xl px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Profile & settings</h1>
          <p className="mt-1 text-sm text-muted">Manage your personal information and account preferences.</p>
        </div>

        {/* Profile card */}
        <div className="card divide-y divide-border">
          <form onSubmit={saveProfile}>
            <div className="px-1">
              <SettingRow label="Full name" desc="Used in emails sent from GentleTap">
                <input
                  className="input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </SettingRow>

              <SettingRow label="Email" desc="Your sign-in email — contact support to change">
                <input className="input cursor-not-allowed opacity-60" value={user.email} readOnly />
              </SettingRow>

              <SettingRow label="I work as…" desc="Helps us personalise reminder tone and templates">
                <div className="grid grid-cols-3 gap-3">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPersona(p.id)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        persona === p.id
                          ? "border-accent bg-accent/5 shadow-sm"
                          : "border-border hover:border-accent/40 hover:bg-background"
                      }`}
                    >
                      <span className="text-xl">{p.icon}</span>
                      <p className="mt-1.5 text-sm font-medium">{p.label}</p>
                      <p className="mt-0.5 text-xs text-muted">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </SettingRow>
            </div>

            {profileError && (
              <p className="mb-4 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
                {profileError}
              </p>
            )}
            <div className="flex items-center gap-4 pb-2 pt-2">
              <button
                type="submit"
                disabled={profileSaving}
                className="btn-primary py-2 text-sm disabled:opacity-60"
              >
                {profileSaving ? "Saving…" : "Save changes"}
              </button>
              {profileSaved && <p className="text-sm text-green">✓ Saved</p>}
            </div>
          </form>
        </div>

        {/* Password card */}
        <div className="card mt-5">
          <h2 className="font-semibold">Password</h2>
          <p className="mt-0.5 text-sm text-muted">
            {user.persona
              ? "Update your account password."
              : "This account uses Google sign-in. You can set a separate password below."}
          </p>
          <form onSubmit={changePassword} className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">New password</label>
              <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                minLength={8}
                required
              />
            </div>
            {pwError && (
              <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{pwError}</p>
            )}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={pwSaving}
                className="btn-secondary py-2 text-sm disabled:opacity-60"
              >
                {pwSaving ? "Updating…" : "Update password"}
              </button>
              {pwSaved && <p className="text-sm text-green">✓ Password updated</p>}
            </div>
          </form>
        </div>

        {/* Connections shortcut */}
        <div className="card mt-5">
          <h2 className="font-semibold">Integrations</h2>
          <p className="mt-0.5 text-sm text-muted">Manage your QuickBooks, email, and WhatsApp connections.</p>
          <a href="/settings/connections" className="btn-secondary mt-4 inline-flex py-2 text-sm">
            Manage connections →
          </a>
        </div>

        {/* Billing shortcut */}
        <div className="card mt-5">
          <h2 className="font-semibold">Billing & plan</h2>
          <p className="mt-0.5 text-sm text-muted">View your current plan, invoices, and upgrade options.</p>
          <a href="/settings/billing" className="btn-secondary mt-4 inline-flex py-2 text-sm">
            Manage billing →
          </a>
        </div>

        {/* Privacy & data */}
        <div className="card mt-5">
          <h2 className="font-semibold">Privacy & data</h2>
          <p className="mt-0.5 text-sm text-muted">
            Download a copy of your data or permanently delete your account. Cancel any active subscription
            in billing first.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-secondary py-2 text-sm disabled:opacity-60"
              onClick={downloadData}
              disabled={exportBusy}
            >
              {exportBusy ? "Preparing…" : "Download my data"}
            </button>
          </div>
          {exportError && (
            <p className="mt-3 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
              {exportError}
            </p>
          )}
          <form onSubmit={deleteAccount} className="mt-6 space-y-3 border-t border-border pt-6">
            <p className="text-sm font-medium text-red">Delete account</p>
            <p className="text-xs text-muted">
              This permanently removes your profile, invoices, clients, reminders, and integration tokens.
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
              <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">
                {deleteError}
              </p>
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
    </DashboardShell>
  );
}
