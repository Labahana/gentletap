"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type AuditEvent, type TeamOverview } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const ACTION_LABELS: Record<string, string> = {
  "team.invite_created": "Invite created",
  "team.invite_accepted": "Invite accepted",
  "team.member_removed": "Member removed",
  "automation.updated": "Automation settings updated",
  "automation.paused": "All reminders paused",
  "automation.resumed": "All reminders resumed",
  "account.email_changed": "Account email changed",
};

export default function TeamSettingsPage() {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamOverview | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "viewer">("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [overview, auditData] = await Promise.all([api.teamOverview(), api.teamAudit()]);
      setTeam(overview);
      setAudit(auditData.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  if (!user) return null;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInviteLink(null);
    try {
      const res = await api.createTeamInvite(email.trim(), role);
      setInviteLink(res.accept_url);
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(memberUserId: string) {
    if (!confirm("Remove this teammate?")) return;
    try {
      await api.removeTeamMember(memberUserId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-semibold">Team</h2>
        <p className="mt-1 text-sm text-muted">
          Invite teammates to help manage invoices and automation. Team seats are on the Team plan.
        </p>

        {team && !team.seats_enabled && (
          <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-600">
            Team seats are available on the Team plan. Upgrade to invite collaborators.
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>
        )}

        {team?.seats_enabled && (
          <form onSubmit={invite} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              className="input flex-1"
              placeholder="teammate@studio.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="input sm:w-36"
              value={role}
              onChange={(e) => setRole(e.target.value as "member" | "viewer")}
            >
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" disabled={busy} className="btn-primary py-2 text-sm disabled:opacity-60">
              {busy ? "Inviting…" : "Invite"}
            </button>
          </form>
        )}

        {inviteLink && (
          <div className="mt-4 rounded-xl border border-border bg-background p-3 text-xs">
            <p className="font-medium">Invite link (share with your teammate):</p>
            <code className="mt-1 block break-all text-muted">{inviteLink}</code>
          </div>
        )}
      </div>

      {team && (
        <div className="card">
          <h3 className="font-semibold">Members</h3>
          <ul className="mt-3 divide-y divide-border">
            <li className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{team.account_email}</p>
                <p className="text-xs text-muted">Account owner</p>
              </div>
              <span className="rounded bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">owner</span>
            </li>
            {team.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{m.full_name || m.email}</p>
                  <p className="text-xs text-muted">{m.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-background px-2 py-0.5 text-xs text-muted">{m.role}</span>
                  {team.role === "owner" && (
                    <button
                      type="button"
                      onClick={() => remove(m.user_id)}
                      className="text-xs text-red hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </li>
            ))}
            {team.invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{i.email}</p>
                  <p className="text-xs text-muted">Invite pending</p>
                </div>
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-600">
                  invited · {i.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {team && audit.length > 0 && (
        <div className="card">
          <h3 className="font-semibold">Activity</h3>
          <p className="mt-1 text-xs text-muted">Recent team actions on this account.</p>
          <ul className="mt-3 divide-y divide-border">
            {audit.map((event) => (
              <li key={event.id} className="flex items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="text-sm">{ACTION_LABELS[event.action] ?? event.action}</p>
                  {event.metadata && typeof event.metadata.email === "string" && (
                    <p className="text-xs text-muted">{event.metadata.email}</p>
                  )}
                </div>
                <p className="shrink-0 text-xs text-muted">
                  {event.created_at ? new Date(event.created_at).toLocaleDateString() : ""}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
