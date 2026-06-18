"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getToken } from "@/lib/api";
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
      </div>
    </DashboardShell>
  );
}
