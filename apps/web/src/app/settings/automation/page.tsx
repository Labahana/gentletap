"use client";

import { useCallback, useEffect, useState } from "react";
import {
  api,
  type AutomationSettingsResponse,
  type CadenceStep,
  type EscalationRule,
} from "@/lib/api";

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
  "UTC",
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CHANNEL_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "both", label: "Email + WhatsApp" },
  { value: "off", label: "Skip step" },
];
const TONE_OPTIONS = [
  { value: "", label: "Auto (AI)" },
  { value: "soft", label: "Soft" },
  { value: "neutral", label: "Neutral" },
  { value: "firm", label: "Firm" },
  { value: "final", label: "Final notice" },
];

function Toggle({
  checked,
  onChange,
  label,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  desc?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {desc && <span className="mt-0.5 block text-xs text-muted">{desc}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AutomationSettingsPage() {
  const [settings, setSettings] = useState<AutomationSettingsResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<CadenceStep[]>([]);
  const [rules, setRules] = useState<EscalationRule[]>([]);

  const load = useCallback(async () => {
    try {
      const [data, rulesData] = await Promise.all([api.automationSettings(), api.escalationRules()]);
      setSettings(data);
      setSteps(data.cadence?.steps ?? []);
      setRules(rulesData.items);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load automation settings");
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [load]);

  if (!settings) {
    return <div className="card p-6 text-sm text-muted">{error ?? "Loading automation…"}</div>;
  }

  const meta = settings.meta;
  const window_ = settings.send_window ?? meta.default_send_window;
  const quiet = settings.whatsapp_quiet_hours ?? meta.default_quiet_hours;

  function patch(body: Parameters<typeof api.updateAutomation>[0]) {
    setSaving(true);
    setSaved(false);
    setError(null);
    api
      .updateAutomation(body)
      .then((data) => {
        setSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Save failed"))
      .finally(() => setSaving(false));
  }

  function saveCadence(nextSteps: CadenceStep[]) {
    setSteps(nextSteps);
    patch({
      cadence: {
        steps: nextSteps,
        pre_due_enabled: settings?.cadence?.pre_due_enabled ?? false,
        pre_due_days: settings?.cadence?.pre_due_days ?? [],
        thank_you_on_payment: settings?.cadence?.thank_you_on_payment ?? false,
      },
    });
  }

  function updateStep(index: number, patchStep: Partial<CadenceStep>) {
    const next = steps.map((s, i) => (i === index ? { ...s, ...patchStep } : s));
    saveCadence(next);
  }

  function addStep() {
    if (steps.length >= meta.max_steps) return;
    const last = steps[steps.length - 1];
    saveCadence([
      ...steps,
      { day_offset: (last?.day_offset ?? 0) + 7, channel: "email", tone: null },
    ]);
  }

  function removeStep(index: number) {
    saveCadence(steps.filter((_, i) => i !== index));
  }

  async function saveRule(rule: Partial<EscalationRule> & { name: string }) {
    setSaving(true);
    setError(null);
    try {
      await api.saveEscalationRule(rule);
      const data = await api.escalationRules();
      setRules(data.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save rule");
    } finally {
      setSaving(false);
    }
  }

  function persistRule(id: string) {
    const current = rules.find((r) => r.id === id);
    if (current) void saveRule(current);
  }

  async function removeRule(id: string) {
    setSaving(true);
    setError(null);
    try {
      await api.deleteEscalationRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete rule");
    } finally {
      setSaving(false);
    }
  }

  function addRule() {
    void saveRule({
      name: `Rule ${rules.length + 1}`,
      enabled: true,
      conditions: { days_overdue_gte: 21 },
      actions: { notify: true, pause_sequence: false, email: false },
      position: rules.length,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Automation control center</h2>
          <p className="mt-1 text-sm text-muted">
            You own when reminders send, on which channel, and when they stop. AI writes the copy.
          </p>
        </div>
        {saving && <span className="text-xs text-muted">Saving…</span>}
        {saved && <span className="text-xs text-green">✓ Saved</span>}
      </div>

      {error && (
        <p className="rounded-xl border border-red/30 bg-red/5 px-4 py-3 text-sm text-red">{error}</p>
      )}

      <Section title="Run state" desc="Pause every active sequence at once (vacation, cash-flow freeze).">
        <div className="divide-y divide-border">
          <Toggle
            checked={settings.pause_all ?? false}
            onChange={(v) => patch({ pause_all: v, pause_reason: v ? "manual" : null })}
            label="Pause all reminders"
            desc="No emails or WhatsApp messages send while this is on."
          />
          {settings.pause_all && (
            <div className="flex items-center gap-3 py-3">
              <label className="text-sm text-muted">Resume on</label>
              <input
                type="date"
                className="input max-w-44"
                value={settings.pause_until?.slice(0, 10) ?? ""}
                onChange={(e) =>
                  patch({ pause_until: e.target.value ? `${e.target.value}T09:00:00Z` : null })
                }
              />
            </div>
          )}
          <Toggle
            checked={settings.autopilot ?? false}
            onChange={(v) => patch({ autopilot: v })}
            label="Autopilot new overdue invoices"
            desc="When off, new invoices wait for your approval before the sequence starts."
          />
        </div>
      </Section>

      <Section title="Cadence" desc="Day offsets from the due date. Channel per step; tone is optional.">
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Day</span>
                <input
                  type="number"
                  className="input w-20"
                  value={step.day_offset}
                  min={-30}
                  max={120}
                  onChange={(e) => updateStep(i, { day_offset: Number(e.target.value) })}
                />
                <span className="text-xs text-muted">
                  {step.day_offset < 0 ? "before due" : step.day_offset === 0 ? "on due date" : "after due"}
                </span>
              </div>
              <select
                className="input"
                value={step.channel}
                onChange={(e) => updateStep(i, { channel: e.target.value as CadenceStep["channel"] })}
              >
                {CHANNEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={step.tone ?? ""}
                onChange={(e) =>
                  updateStep(i, { tone: (e.target.value || null) as CadenceStep["tone"] })
                }
              >
                {TONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="text-xs text-red hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={addStep}
              disabled={steps.length >= meta.max_steps}
              className="btn-secondary py-1.5 text-xs disabled:opacity-50"
            >
              + Add step
            </button>
            <Toggle
              checked={settings.cadence?.thank_you_on_payment ?? false}
              onChange={(v) =>
                patch({
                  cadence: {
                    steps,
                    pre_due_enabled: settings.cadence?.pre_due_enabled ?? false,
                    pre_due_days: settings.cadence?.pre_due_days ?? [],
                    thank_you_on_payment: v,
                  },
                })
              }
              label="Send a thank-you when an invoice is paid"
            />
          </div>
        </div>
      </Section>

      <Section title="Send window" desc="Reminders only send inside these hours, in your timezone.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted">Timezone</span>
            <select
              className="input mt-1"
              value={settings.timezone}
              onChange={(e) => patch({ timezone: e.target.value })}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted">From</span>
              <select
                className="input mt-1"
                value={window_.start}
                onChange={(e) => patch({ send_window: { ...window_, start: Number(e.target.value) } })}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted">To</span>
              <select
                className="input mt-1"
                value={window_.end}
                onChange={(e) => patch({ send_window: { ...window_, end: Number(e.target.value) } })}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {DAY_LABELS.map((label, idx) => {
            const active = window_.days.includes(idx);
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  const days = active
                    ? window_.days.filter((d) => d !== idx)
                    : [...window_.days, idx].sort();
                  patch({ send_window: { ...window_, days } });
                }}
                className={`rounded-md px-2.5 py-1 text-xs ${
                  active ? "bg-accent text-white" : "bg-background text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 divide-y divide-border">
          <Toggle
            checked={settings.skip_weekends ?? true}
            onChange={(v) => patch({ skip_weekends: v })}
            label="Skip weekends"
          />
          <Toggle
            checked={settings.skip_holidays ?? false}
            onChange={(v) => patch({ skip_holidays: v })}
            label="Skip public holidays"
            desc="Uses your country’s public holiday calendar."
          />
        </div>
      </Section>

      <Section title="Guardrails" desc="Rules that stop automation before it touches a client.">
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Minimum chase amount</p>
              <p className="mt-0.5 text-xs text-muted">Don’t chase invoices below this balance.</p>
            </div>
            <input
              type="number"
              className="input w-28"
              placeholder="e.g. 50"
              min={0}
              value={settings.min_amount ?? ""}
              onChange={(e) =>
                patch({ min_amount: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </div>
          <Toggle
            checked={settings.suppress_disputed ?? true}
            onChange={(v) => patch({ suppress_disputed: v })}
            label="Pause when a client disputes"
            desc="Disputed invoices never get automated reminders."
          />
          <Toggle
            checked={settings.suppress_on_reply ?? false}
            onChange={(v) => patch({ suppress_on_reply: v })}
            label="Pause for 7 days when a client replies"
            desc="Gives you room to respond personally before automation resumes."
          />
          <Toggle
            checked={settings.stop_on_payment ?? true}
            onChange={(v) => patch({ stop_on_payment: v })}
            label="Stop when paid"
            desc="Always on for synced invoices; controls manual marks too."
          />
        </div>
      </Section>

      <Section
        title="Escalation rules"
        desc="When an invoice matches a rule, GentleTap flags it in your dashboard and inbox."
      >
        <div className="space-y-3">
          {rules.length === 0 && (
            <p className="text-sm text-muted">No rules yet — add one to get alerted on risky invoices.</p>
          )}
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <input
                  className="input max-w-56"
                  value={rule.name}
                  maxLength={80}
                  onChange={(e) =>
                    setRules((prev) =>
                      prev.map((r) => (r.id === rule.id ? { ...r, name: e.target.value } : r)),
                    )
                  }
                  onBlur={() => persistRule(rule.id)}
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={rule.enabled}
                      onChange={(e) => void saveRule({ ...rule, enabled: e.target.checked })}
                    />
                    On
                  </label>
                  <button
                    type="button"
                    onClick={() => void removeRule(rule.id)}
                    className="text-xs text-red hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="text-xs text-muted">Days overdue ≥</span>
                  <input
                    type="number"
                    className="input mt-1"
                    min={0}
                    value={rule.conditions.days_overdue_gte ?? ""}
                    placeholder="any"
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      setRules((prev) =>
                        prev.map((r) =>
                          r.id === rule.id
                            ? {
                                ...r,
                                conditions: { ...r.conditions, days_overdue_gte: v as number },
                              }
                            : r,
                        ),
                      );
                    }}
                    onBlur={() => persistRule(rule.id)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Balance ≥</span>
                  <input
                    type="number"
                    className="input mt-1"
                    min={0}
                    value={rule.conditions.amount_gte ?? ""}
                    placeholder="any"
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      setRules((prev) =>
                        prev.map((r) =>
                          r.id === rule.id
                            ? { ...r, conditions: { ...r.conditions, amount_gte: v as number } }
                            : r,
                        ),
                      );
                    }}
                    onBlur={() => persistRule(rule.id)}
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-muted">Reminder step ≥</span>
                  <input
                    type="number"
                    className="input mt-1"
                    min={0}
                    value={rule.conditions.min_step_gte ?? ""}
                    placeholder="any"
                    onChange={(e) => {
                      const v = e.target.value === "" ? undefined : Number(e.target.value);
                      setRules((prev) =>
                        prev.map((r) =>
                          r.id === rule.id
                            ? { ...r, conditions: { ...r.conditions, min_step_gte: v as number } }
                            : r,
                        ),
                      );
                    }}
                    onBlur={() => persistRule(rule.id)}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-4">
                {(
                  [
                    ["notify", "In-app alert"],
                    ["email", "Email me"],
                    ["pause_sequence", "Pause sequence"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 text-xs">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-accent"
                      checked={rule.actions[key] ?? false}
                      onChange={(e) =>
                        void saveRule({ ...rule, actions: { ...rule.actions, [key]: e.target.checked } })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addRule}
            disabled={saving || rules.length >= 10}
            className="btn-secondary py-1.5 text-xs disabled:opacity-50"
          >
            + Add rule
          </button>
        </div>
      </Section>

      <Section title="WhatsApp timing" desc="How long after the email the WhatsApp follow-up sends.">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs text-muted">Delay after email (hours)</span>
            <input
              type="number"
              className="input mt-1"
              min={0}
              max={72}
              value={settings.whatsapp_delay_hours ?? 3}
              onChange={(e) => patch({ whatsapp_delay_hours: Number(e.target.value) })}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-muted">Quiet from</span>
              <select
                className="input mt-1"
                value={quiet.start}
                onChange={(e) =>
                  patch({ whatsapp_quiet_hours: { ...quiet, start: Number(e.target.value) } })
                }
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-muted">Quiet until</span>
              <select
                className="input mt-1"
                value={quiet.end}
                onChange={(e) =>
                  patch({ whatsapp_quiet_hours: { ...quiet, end: Number(e.target.value) } })
                }
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </Section>

      <Section title="Sender identity" desc="Optional signature appended to reminder emails.">
        <textarea
          className="input min-h-24"
          placeholder={"Thanks,\nAlex\nAcme Studio"}
          value={settings.signature_block ?? ""}
          onChange={(e) => patch({ signature_block: e.target.value || null })}
        />
      </Section>
    </div>
  );
}
