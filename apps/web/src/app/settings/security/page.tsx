"use client";

import { useState } from "react";
import { api, getToken } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export default function SecuritySettingsPage() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  if (!user) return null;

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
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
    <div className="card">
      <h2 className="font-semibold">Security</h2>
      <p className="mt-1 text-sm text-muted">
        {user.persona
          ? "Update your account password."
          : "This account may use Google sign-in. You can still set a separate password below."}
      </p>
      <form onSubmit={changePassword} className="mt-4 space-y-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium">New password</label>
          <input
            type="password"
            className="input max-w-md"
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
          <button type="submit" disabled={pwSaving} className="btn-secondary py-2 text-sm disabled:opacity-60">
            {pwSaving ? "Updating…" : "Update password"}
          </button>
          {pwSaved && <p className="text-sm text-green">✓ Password updated</p>}
        </div>
      </form>
    </div>
  );
}
