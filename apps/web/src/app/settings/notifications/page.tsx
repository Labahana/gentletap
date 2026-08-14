"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type NotificationPrefsResponse } from "@/lib/api";

const EVENT_LABELS: Record<string, { label: string; desc: string }> = {
  payment_received: { label: "Payment received", desc: "When an invoice is marked paid" },
  payment_failed: { label: "Payment failed", desc: "When your subscription payment fails" },
  client_replied: { label: "Client replied", desc: "WhatsApp replies and payment claims" },
  whatsapp_failed: { label: "WhatsApp failed", desc: "When a WhatsApp send fails" },
  escalation: { label: "Escalation recommended", desc: "When an invoice needs a personal touch" },
  sync_error: { label: "Sync error", desc: "QuickBooks / FreshBooks sync problems" },
  quota_low: { label: "Quota low", desc: "Collections or WhatsApp credits running out" },
  sends_digest: { label: "Tomorrow’s sends", desc: "A morning digest of scheduled reminders" },
};

const CHANNEL_LABELS: Record<string, string> = {
  in_app: "In app",
  email: "Email",
};

export default function NotificationsSettingsPage() {
  const [data, setData] = useState<NotificationPrefsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await api.notificationPreferences());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load preferences");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  if (!data) {
    return <div className="card p-6 text-sm text-muted">{error ?? "Loading notification preferences…"}</div>;
  }

  function toggle(event: string, channel: string) {
    if (!data) return;
    const prefs = {
      ...data.prefs,
      [event]: { ...data.prefs[event], [channel]: !data.prefs[event]?.[channel] },
    };
    setData({ ...data, prefs });
    setSaving(true);
    setSaved(false);
    api
      .updateNotificationPreferences(prefs)
      .then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Save failed"))
      .finally(() => setSaving(false));
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Notifications</h2>
          <p className="mt-1 text-sm text-muted">
            Choose which events reach you, and where.
          </p>
        </div>
        {saving && <span className="text-xs text-muted">Saving…</span>}
        {saved && <span className="text-xs text-green">✓ Saved</span>}
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="py-2 pr-4 font-medium">Event</th>
              {data.channels.map((ch) => (
                <th key={ch} className="py-2 pr-4 font-medium">
                  {CHANNEL_LABELS[ch] ?? ch}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.events.map((event) => (
              <tr key={event} className="border-b border-border/60">
                <td className="py-3 pr-4">
                  <p className="font-medium">{EVENT_LABELS[event]?.label ?? event}</p>
                  <p className="text-xs text-muted">{EVENT_LABELS[event]?.desc ?? ""}</p>
                </td>
                {data.channels.map((ch) => (
                  <td key={ch} className="py-3 pr-4">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={data.prefs[event]?.[ch] ?? false}
                      onChange={() => toggle(event, ch)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
