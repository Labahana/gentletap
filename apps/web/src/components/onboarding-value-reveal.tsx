"use client";

import { formatMoney } from "@/lib/onboarding";
import type { ReminderPreviewItem } from "@/lib/api";

export const EXAMPLE_PREVIEW: ReminderPreviewItem = {
  invoice_id: "example",
  doc_number: "1042",
  client_name: "Sarah Chen",
  client_email: "sarah@client.com",
  balance: 4200,
  days_overdue: 18,
  status: "yellow",
  subject: "Friendly reminder — Invoice #1042",
  body:
    "Hi Sarah,\n\nJust a quick note that invoice #1042 for $4,200.00 is still outstanding (18 days overdue). Please let me know if you have any questions or if payment is on the way.\n\nThanks!",
};

function SequenceTimeline() {
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

function EmailPreviewCard({
  preview,
  senderLabel,
  example,
}: {
  preview: ReminderPreviewItem;
  senderLabel: string;
  example?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 text-sm">
      {example && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Example preview</p>
      )}
      <div className="space-y-1 border-b border-border pb-3 text-xs text-muted">
        <p>
          <span className="font-medium text-foreground">From:</span> {senderLabel}
        </p>
        <p>
          <span className="font-medium text-foreground">To:</span>{" "}
          {preview.client_email || `${preview.client_name.toLowerCase().replace(/\s+/g, ".")}@client.com`}
        </p>
        {preview.subject && (
          <p>
            <span className="font-medium text-foreground">Subject:</span> {preview.subject}
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        {preview.client_name} · #{preview.doc_number} · {formatMoney(preview.balance)} · {preview.days_overdue}d
        overdue
      </p>
      {preview.error ? (
        <p className="mt-2 text-red-600">{preview.error}</p>
      ) : (
        <>
          <pre className="mt-3 whitespace-pre-wrap font-sans leading-relaxed text-foreground">{preview.body}</pre>
          <p className="mt-2 text-xs text-green">Written in your voice — not a template blast</p>
        </>
      )}
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="animate-pulse rounded-xl border border-border bg-background p-4">
          <div className="h-3 w-1/3 rounded bg-border" />
          <div className="mt-3 h-3 w-2/3 rounded bg-border" />
          <div className="mt-4 h-16 rounded bg-border" />
        </div>
      ))}
    </div>
  );
}

type Props = {
  invoiceCount: number;
  totalOutstanding: number;
  oldestDays: number;
  avgDays: number;
  previews: ReminderPreviewItem[];
  senderLabel: string;
  syncing?: boolean;
  previewsLoading?: boolean;
  senderNote?: string;
};

export function OnboardingValueReveal({
  invoiceCount,
  totalOutstanding,
  oldestDays,
  avgDays,
  previews,
  senderLabel,
  syncing,
  previewsLoading,
  senderNote,
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
      <div className="space-y-6">
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

        {previewsLoading ? (
          <div className="space-y-3">
            <p className="text-sm font-medium animate-pulse text-muted">Drafting reminders in your voice…</p>
            <PreviewSkeleton />
          </div>
        ) : previews.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Here&apos;s what GentleTap will send — AI-drafted, in your voice:</p>
            {senderNote && <p className="text-xs text-muted">{senderNote}</p>}
            {previews.slice(0, 3).map((p) => (
              <EmailPreviewCard key={p.invoice_id} preview={p} senderLabel={senderLabel} />
            ))}
            {invoiceCount > 3 && (
              <p className="text-center text-sm text-muted">
                + {invoiceCount - 3} more invoice{invoiceCount - 3 === 1 ? "" : "s"} ready to go
              </p>
            )}
          </div>
        ) : null}

        <SequenceTimeline />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        No overdue invoices yet. When they appear, GentleTap drafts reminders automatically.
      </p>
      <EmailPreviewCard preview={EXAMPLE_PREVIEW} senderLabel={senderLabel} example />
      {senderNote && <p className="text-xs text-muted">{senderNote}</p>}
      <SequenceTimeline />
    </div>
  );
}
