"use client";

import Link from "next/link";
import type { InvoiceItem } from "@/lib/api";
import { formatMoney } from "@/lib/onboarding";
import { DashIcon } from "@/components/dashboard-icons";
import {
  activityIcon,
  CHASE_BADGE,
  DOT_COLOR,
  formatActivityTime,
  invoiceMetaLine,
  invoiceStatusText,
  STATUS_COLOR,
  SOURCE_BADGE,
  invoiceSourceOf,
  type InvoiceFilter,
  type InvoiceSourceFilter,
} from "@/lib/dashboard-ui";

export function AutopilotBar({
  activeSequences,
  lastActionLine,
  lastActionShort,
  compact,
}: {
  activeSequences: number;
  lastActionLine: string | null;
  lastActionShort?: string | null;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green/30 bg-green/10 px-3 py-2.5">
        <DashIcon name="robot" size={16} className="mt-0.5 shrink-0 text-green" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-green">Autopilot is on</p>
          <p className="text-[10px] text-green/80 leading-snug">
            {activeSequences} sequence{activeSequences === 1 ? "" : "s"} running
            {lastActionShort ? ` · ${lastActionShort}` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-xl border border-green/30 bg-green/10 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-center gap-2 text-[13px] font-medium text-green">
        <DashIcon name="robot" size={18} className="shrink-0" />
        GentleTap is handling everything — {activeSequences} active sequence
        {activeSequences === 1 ? "" : "s"} running right now
      </p>
      {lastActionLine && <p className="text-[11px] text-green/90">{lastActionLine}</p>}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  sub,
  subClass,
  hero,
}: {
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
  hero?: boolean;
}) {
  return (
    <div
      className={`rounded-xl bg-background/80 ${hero ? "border border-border px-3.5 py-3.5 text-center" : "px-3 py-2.5"}`}
    >
      <p className={`text-muted ${hero ? "text-[11px]" : "text-[10px]"}`}>{label}</p>
      <p className={`font-medium text-foreground ${hero ? "mt-1 text-[32px] leading-none" : "mt-0.5 text-base"}`}>
        {value}
      </p>
      {sub && (
        <p className={`mt-0.5 ${hero ? "text-[11px]" : "text-[10px]"} ${subClass ?? "text-muted"}`}>{sub}</p>
      )}
    </div>
  );
}

export function EscalationBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-yellow/40 bg-yellow/10 px-3 py-2.5 text-xs">
      <DashIcon name="info" size={16} className="mt-0.5 shrink-0 text-yellow-900" />
      <p className="flex-1 leading-relaxed text-yellow-900">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-[11px] text-yellow-900/70 hover:text-yellow-900"
      >
        Dismiss
      </button>
    </div>
  );
}

export function InvoiceSourceBadge({ inv }: { inv: InvoiceItem }) {
  const source = invoiceSourceOf(inv);
  const badge = SOURCE_BADGE[source];
  return (
    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function showAddWhatsappButton(inv: InvoiceItem) {
  if (inv.balance <= 0) return false;
  if (inv.whatsapp_phone_missing !== undefined) return inv.whatsapp_phone_missing;
  return !inv.reminder_phone && !inv.effective_reminder_phone;
}

function InvoiceRowActionButtons({ inv }: { inv: InvoiceItem }) {
  const addWhatsapp = showAddWhatsappButton(inv);
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Link
        href={`/dashboard/invoices/${inv.id}`}
        className="rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-medium hover:border-accent/40 hover:text-accent"
      >
        Manage invoice
      </Link>
      {addWhatsapp && (
        <Link
          href={`/dashboard/invoices/${inv.id}#reminder-contacts`}
          className="rounded-full bg-green px-2.5 py-1 text-[10px] font-semibold text-white hover:opacity-90"
        >
          Add WhatsApp number
        </Link>
      )}
    </div>
  );
}

export function InvoiceOverviewRow({
  inv,
  onMarkPaid,
  markPaidBusy,
  showWhatsappHints,
  selectable,
  selected,
  onToggleSelect,
}: {
  inv: InvoiceItem;
  onMarkPaid?: (id: string) => void;
  markPaidBusy?: string | null;
  showWhatsappHints?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const label = inv.chase_label ?? "upcoming";
  const statusClass = STATUS_COLOR[label] ?? "text-muted";
  const showMarkPaid =
    invoiceSourceOf(inv) === "upload" && inv.balance > 0 && onMarkPaid;

  return (
    <div className="flex items-center gap-2 border-b border-border/60 py-2.5 last:border-0">
      {selectable && onToggleSelect && inv.balance > 0 && invoiceSourceOf(inv) === "upload" && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(inv.id)}
          className="shrink-0 rounded border-border"
          aria-label={`Select invoice ${inv.doc_number ?? inv.id}`}
        />
      )}
      <Link
        href={`/dashboard/invoices/${inv.id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 hover:opacity-80"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${DOT_COLOR[label]}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[13px] font-medium">{inv.client_name}</p>
            <InvoiceSourceBadge inv={inv} />
            {inv.needs_attention && (
              <span
                className="shrink-0 text-[10px] font-medium text-amber-700 dark:text-amber-300"
                title={inv.attention_label ?? ""}
              >
                ⚠
              </span>
            )}
          </div>
          <p className="truncate text-[11px] text-muted">{invoiceMetaLine(inv)}</p>
        </div>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="text-right">
          <p className="text-[13px] font-semibold tabular-nums">{formatMoney(inv.balance, inv.currency)}</p>
          <p className={`text-[11px] ${statusClass}`}>{invoiceStatusText(inv)}</p>
        </div>
        <InvoiceRowActionButtons inv={inv} />
      </div>
      {showMarkPaid && (
        <button
          type="button"
          disabled={markPaidBusy === inv.id}
          onClick={() => onMarkPaid(inv.id)}
          className="shrink-0 rounded-full border border-border px-2 py-1 text-[10px] font-medium hover:bg-background disabled:opacity-50"
        >
          {markPaidBusy === inv.id ? "…" : "Mark paid"}
        </button>
      )}
    </div>
  );
}

export function InvoiceMobileCard({
  inv,
  onMarkPaid,
  markPaidBusy,
  showWhatsappHints,
  selectable,
  selected,
  onToggleSelect,
}: {
  inv: InvoiceItem;
  onMarkPaid?: (id: string) => void;
  markPaidBusy?: string | null;
  showWhatsappHints?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const label = inv.chase_label ?? "upcoming";
  const badge = CHASE_BADGE[label];
  const showMarkPaid =
    invoiceSourceOf(inv) === "upload" && inv.balance > 0 && onMarkPaid;

  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <div className="flex items-start gap-2">
        {selectable && onToggleSelect && inv.balance > 0 && invoiceSourceOf(inv) === "upload" && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(inv.id)}
            className="mt-1 shrink-0 rounded border-border"
            aria-label={`Select invoice ${inv.doc_number ?? inv.id}`}
          />
        )}
        <div className="min-w-0 flex-1">
          <Link href={`/dashboard/invoices/${inv.id}`} className="block">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-[13px] font-medium">{inv.client_name}</p>
                <InvoiceSourceBadge inv={inv} />
                {inv.needs_attention && <span className="text-[10px] text-amber-700">⚠</span>}
              </div>
              <p className="shrink-0 text-[13px] font-semibold tabular-nums">
                {formatMoney(inv.balance, inv.currency)}
              </p>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="truncate text-[10px] text-muted">
                INV #{inv.doc_number ?? "—"} · {invoiceStatusText(inv).toLowerCase()}
              </p>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                {badge.label}
              </span>
            </div>
          </Link>
          <div className="mt-2">
            <InvoiceRowActionButtons inv={inv} />
          </div>
          {showMarkPaid && (
            <button
              type="button"
              disabled={markPaidBusy === inv.id}
              onClick={() => onMarkPaid(inv.id)}
              className="mt-2 rounded-full border border-border px-2.5 py-1 text-[10px] font-medium hover:bg-background disabled:opacity-50"
            >
              {markPaidBusy === inv.id ? "Marking paid…" : "Mark paid"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ActivityFeed({
  items,
  currency,
  compact,
}: {
  items: Array<{
    kind: string;
    channel?: string | null;
    title: string;
    subtitle?: string | null;
    amount?: number | null;
    at: string;
    invoice_id?: string | null;
  }>;
  currency: string;
  compact?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted">No activity yet — GentleTap will show actions here.</p>
    );
  }

  return (
    <div>
      {items.map((item, i) => {
        const { icon, className } = activityIcon(item.kind, item.channel);
        const isPayment = item.kind === "payment";
        const mobileTitle = isPayment
          ? item.title.split(" paid")[0] + " paid"
          : item.title
              .replace(/^WhatsApp sent to /, "WhatsApp → ")
              .replace(/^Gentle reminder sent to /, "Reminder → ")
              .replace(/^Firm final notice sent to /, "Final notice → ");

        const inner = (
          <div className={`flex items-start gap-2 border-b border-border/60 py-2 last:border-0`}>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${className}`}
            >
              <DashIcon name={icon} size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug">{compact ? mobileTitle : item.title}</p>
              <p className="mt-0.5 text-[10px] text-muted">{formatActivityTime(item.at)}</p>
            </div>
            {item.amount != null && item.amount > 0 && (
              <span
                className={`shrink-0 text-xs font-medium tabular-nums ${isPayment ? "text-green" : "text-foreground"}`}
              >
                {isPayment ? "+" : ""}
                {formatMoney(item.amount, currency)}
              </span>
            )}
          </div>
        );

        if (item.invoice_id) {
          return (
            <Link key={`${item.at}-${i}`} href={`/dashboard/invoices/${item.invoice_id}`} className="block">
              {inner}
            </Link>
          );
        }
        return <div key={`${item.at}-${i}`}>{inner}</div>;
      })}
    </div>
  );
}

export function FilterChips({
  value,
  onChange,
  counts,
}: {
  value: InvoiceFilter;
  onChange: (f: InvoiceFilter) => void;
  counts: Record<InvoiceFilter, number>;
}) {
  const chips: { id: InvoiceFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "chasing", label: "Chasing" },
    { id: "overdue", label: "Overdue" },
    { id: "paid", label: "Paid" },
  ];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
            value === c.id
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          {c.label} ({counts[c.id]})
        </button>
      ))}
    </div>
  );
}

export function SourceFilterChips({
  value,
  onChange,
  counts,
}: {
  value: InvoiceSourceFilter;
  onChange: (f: InvoiceSourceFilter) => void;
  counts: Record<InvoiceSourceFilter, number>;
}) {
  const chips: { id: InvoiceSourceFilter; label: string }[] = [
    { id: "all", label: "All sources" },
    { id: "quickbooks", label: "QuickBooks" },
    { id: "upload", label: "Uploaded" },
  ];
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-medium transition ${
            value === c.id
              ? "border-accent bg-accent/10 text-accent"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          {c.label} ({counts[c.id]})
        </button>
      ))}
    </div>
  );
}

export function InvoiceSectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="border-b border-border bg-background/60 px-1 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      {subtitle && <p className="text-[10px] text-muted">{subtitle}</p>}
    </div>
  );
}

export function StatMiniCard({
  label,
  value,
  sub,
  barPct,
  barClass,
}: {
  label: string;
  value: string;
  sub: string;
  barPct: number;
  barClass: string;
}) {
  return (
    <div className="rounded-xl bg-background/80 px-3.5 py-3">
      <p className="text-[11px] text-muted">{label}</p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(100, barPct)}%` }} />
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="font-medium text-foreground">{value}</span>
        <span className="text-muted">{sub}</span>
      </div>
    </div>
  );
}

export function NotifBell({ href, unread }: { href: string; unread: number }) {
  return (
    <Link
      href={href}
      className="relative shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-muted hover:text-foreground"
      aria-label="Notifications"
    >
      <DashIcon name="alerts" size={16} />
      {unread > 0 && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red" />}
    </Link>
  );
}

/** Simple bar chart without external chart library */
export function TrendBars({
  data,
  currency,
}: {
  data: Array<{ month: string; collected: number }>;
  currency: string;
}) {
  const max = Math.max(...data.map((d) => d.collected), 1);
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d) => (
        <div key={`${d.month}`} className="flex flex-1 flex-col items-center gap-1">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md bg-green/70 transition-all"
              style={{ height: `${Math.max(4, (d.collected / max) * 100)}%` }}
              title={formatMoney(d.collected, currency)}
            />
          </div>
          <span className="text-[10px] text-muted">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

export function HorizontalBars({
  items,
  formatValue,
}: {
  items: Array<{ label: string; value: number; className?: string }>;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-0.5 flex justify-between text-[11px]">
            <span className="text-muted">{item.label}</span>
            <span className="font-medium">{formatValue ? formatValue(item.value) : item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full ${item.className ?? "bg-accent"}`}
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
