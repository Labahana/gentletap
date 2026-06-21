"use client";

import { useState } from "react";
import { SequenceTimeline } from "@/components/onboarding-import-stats";
import { formatMoney } from "@/lib/onboarding";
import type { ReminderPreviewItem } from "@/lib/api";

export const EXAMPLE_PREVIEW: ReminderPreviewItem = {
  invoice_id: "example",
  doc_number: "1024",
  client_name: "Red Rock Diner",
  client_email: "red.rock.diner@client.com",
  balance: 156,
  days_overdue: 142,
  status: "red",
  subject: "Quick follow-up — Invoice #1024",
  body:
    "Hi there,\n\nJust following up on invoice #1024 for $156.00 — it's been a little while now, so wanted to make sure it's on your radar. Let me know if anything's holding it up.\n\nPayment link: [link]",
};

function toneNote(preview: ReminderPreviewItem): string | null {
  if (preview.tone_insight) {
    return preview.tone_insight.replace(
      /we'll lead with a firm, direct tone and a clear next step/i,
      "we'll lead with a firmer, clearer tone on this one",
    );
  }
  if (preview.needs_firm_tone || preview.error === "escalation_recommended") {
    const days = preview.days_overdue;
    if (days >= 30) {
      return `${days} days overdue — we'll lead with a firmer, clearer tone on this one.`;
    }
  }
  return null;
}

function StatCards({
  totalOutstanding,
  invoiceCount,
  avgDays,
}: {
  totalOutstanding: number;
  invoiceCount: number;
  avgDays: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl bg-[#faf6f0] px-3 py-4 text-center">
        <p className="text-xl font-bold leading-tight text-foreground sm:text-2xl">
          {formatMoney(totalOutstanding)}
        </p>
        <p className="mt-1 text-xs text-muted">Outstanding</p>
      </div>
      <div className="rounded-xl bg-[#faf6f0] px-3 py-4 text-center">
        <p className="text-xl font-bold text-foreground sm:text-2xl">{invoiceCount}</p>
        <p className="mt-1 text-xs text-muted">Invoices</p>
      </div>
      <div className="rounded-xl bg-[#faf6f0] px-3 py-4 text-center">
        <p className="text-xl font-bold text-foreground sm:text-2xl">{avgDays > 0 ? avgDays : "—"}</p>
        <p className="mt-1 text-xs text-muted">Avg overdue</p>
      </div>
    </div>
  );
}

function EmailFrame({
  preview,
  senderLabel,
}: {
  preview: ReminderPreviewItem;
  senderLabel: string;
}) {
  const to = preview.client_email || `${preview.client_name.toLowerCase().replace(/\s+/g, ".")}@client.com`;
  const subject =
    preview.subject ||
    `Quick follow-up — Invoice #${preview.doc_number ?? "invoice"}`;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="space-y-1.5 border-b border-border bg-gray-50/80 px-4 py-3 text-sm">
        <p>
          <span className="font-medium text-foreground">From:</span>{" "}
          <span className="text-foreground">{senderLabel}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">To:</span>{" "}
          <span className="text-muted">{to}</span>
        </p>
        <p>
          <span className="font-medium text-foreground">Subject:</span>{" "}
          <span className="text-foreground">{subject}</span>
        </p>
      </div>
      <div className="px-4 py-4 text-sm leading-relaxed text-foreground">
        {preview.body ? (
          <pre className="whitespace-pre-wrap font-sans">{preview.body}</pre>
        ) : (
          <p className="text-muted">
            GentleTap will draft a personalized reminder for {preview.client_name}. Each invoice gets its own message
            based on amount, history, and how long it&apos;s been open.
          </p>
        )}
      </div>
    </div>
  );
}

function ToneNoteBanner({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-sm bg-amber-400" aria-hidden />
      <p>{note}</p>
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-border bg-white">
      <div className="space-y-2 border-b border-border bg-gray-50 px-4 py-3">
        <div className="h-3 w-1/2 rounded bg-border" />
        <div className="h-3 w-1/3 rounded bg-border" />
        <div className="h-3 w-2/3 rounded bg-border" />
      </div>
      <div className="space-y-2 px-4 py-4">
        <div className="h-3 w-full rounded bg-border" />
        <div className="h-3 w-5/6 rounded bg-border" />
        <div className="h-3 w-4/6 rounded bg-border" />
      </div>
    </div>
  );
}

export function pickFeaturedPreview(items: ReminderPreviewItem[]): ReminderPreviewItem | null {
  return items.find((p) => p.body && !p.error) ?? items[0] ?? null;
}

type Props = {
  invoiceCount: number;
  totalOutstanding: number;
  avgDays: number;
  previews: ReminderPreviewItem[];
  senderLabel: string;
  loading?: boolean;
  onBack: () => void;
  onContinue: () => void;
};

export function OnboardingPreviewStep({
  invoiceCount,
  totalOutstanding,
  avgDays,
  previews,
  senderLabel,
  loading,
  onBack,
  onContinue,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  const featured = pickFeaturedPreview(previews);
  const display = featured ?? EXAMPLE_PREVIEW;
  const note = toneNote(display);
  const moreCount = Math.max(invoiceCount - 1, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-lg font-bold text-foreground">Here&apos;s what GentleTap will send</h3>
        <p className="text-sm text-muted">AI-drafted, sent from your real inbox — in your voice</p>
      </div>

      {invoiceCount > 0 && (
        <StatCards totalOutstanding={totalOutstanding} invoiceCount={invoiceCount} avgDays={avgDays} />
      )}

      {loading ? (
        <>
          <p className="text-sm text-muted animate-pulse">Drafting your first reminder…</p>
          <PreviewSkeleton />
        </>
      ) : (
        <>
          <EmailFrame preview={display} senderLabel={senderLabel} />
          {note && <ToneNoteBanner note={note} />}
        </>
      )}

      {moreCount > 0 && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
          <p>
            + {moreCount} more invoice{moreCount === 1 ? "" : "s"} ready, each personalized to that client&apos;s
            history
          </p>
          {previews.length > 1 && (
            <button
              type="button"
              className="shrink-0 font-medium text-accent hover:underline"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? "Hide" : "See all →"}
            </button>
          )}
        </div>
      )}

      {showAll && previews.length > 1 && (
        <div className="space-y-4">
          {previews.slice(1, 5).map((p) => (
            <div key={p.invoice_id} className="space-y-2">
              <EmailFrame preview={p} senderLabel={senderLabel} />
              {toneNote(p) && <ToneNoteBanner note={toneNote(p)!} />}
            </div>
          ))}
        </div>
      )}

      <SequenceTimeline />

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn-primary w-full sm:w-auto" disabled={loading} onClick={onContinue}>
          {loading ? "Loading…" : "Continue to plans"}
        </button>
      </div>
    </div>
  );
}
