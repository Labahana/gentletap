"use client";

import { formatMoney } from "@/lib/onboarding";

type Props = {
  invoiceCount: number;
  totalOutstanding: number;
  oldestDays?: number;
  avgDays?: number;
  syncing?: boolean;
};

export function OnboardingImportStats({
  invoiceCount,
  totalOutstanding,
  oldestDays = 0,
  avgDays = 0,
  syncing,
}: Props) {
  if (syncing) {
    return (
      <div className="rounded-xl bg-background p-10 text-center">
        <p className="text-sm text-muted animate-pulse">Syncing your invoices…</p>
      </div>
    );
  }

  if (invoiceCount > 0) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-8 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">We found</p>
          <p className="mt-2 text-5xl font-bold text-foreground">{invoiceCount}</p>
          <p className="text-lg text-muted">
            overdue invoice{invoiceCount === 1 ? "" : "s"}
          </p>
          <p className="mt-4 text-3xl font-semibold">{formatMoney(totalOutstanding)}</p>
          <p className="text-sm text-muted">total outstanding</p>
          {(oldestDays > 0 || avgDays > 0) && (
            <p className="mt-3 text-sm text-muted">
              Oldest: {oldestDays} days · Average: {avgDays} days overdue
            </p>
          )}
        </div>
        <p className="text-center text-sm text-muted">
          Next, connect how reminders will send — then we&apos;ll show you a real draft from your inbox.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        No overdue invoices yet. You can still connect email and turn on autopilot — GentleTap will draft reminders
        automatically when invoices become overdue.
      </p>
    </div>
  );
}

export function SequenceTimeline() {
  const rows = [
    { when: "Day 0", channel: "Email", detail: "Gentle reminder from your inbox" },
    { when: "+3 days", channel: "Email", detail: "Professional follow-up" },
    { when: "+3 hours later", channel: "WhatsApp", detail: "Short nudge (Pro+ plans)" },
    { when: "Up to 5 touches", channel: "Email", detail: "Escalates only when needed" },
    { when: "When marked paid", channel: "Stops", detail: "Autopilot ends — no manual cleanup" },
  ];
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-medium">What happens over time</p>
      <ol className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.when} className="flex gap-3 text-sm">
            <span className="w-28 shrink-0 text-xs font-medium text-muted">{row.when}</span>
            <span className="w-16 shrink-0 text-xs font-semibold">{row.channel}</span>
            <span className={`text-muted ${row.channel === "Stops" ? "font-medium text-green" : ""}`}>
              {row.detail}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
