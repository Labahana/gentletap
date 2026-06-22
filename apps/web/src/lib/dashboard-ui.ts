import type { InvoiceItem } from "./api";
import { formatLastSync } from "./onboarding";

export type ChaseLabel = NonNullable<InvoiceItem["chase_label"]>;
export type InvoiceFilter = "all" | "chasing" | "overdue" | "paid";
export type InvoiceSourceFilter = "all" | "quickbooks" | "upload";

export function greetingName(fullName: string | null | undefined, email: string): string {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0]!;
  return email.split("@")[0] ?? "there";
}

export function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Sample-style "Today · 9:14am" */
export function formatActivityTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function syncSubline(lastSyncAt: string | null | undefined, mobile = false): string {
  const last = formatLastSync(lastSyncAt);
  if (mobile && last) return `Synced ${last}`;
  if (last) return `QuickBooks synced ${last} · everything is up to date`;
  return "QuickBooks syncs automatically every 30 min";
}

export function lastActionLine(
  lastAction: { channel: string; client_name: string; sent_at: string | null } | null | undefined,
): string | null {
  if (!lastAction?.sent_at) return null;
  const channel = lastAction.channel === "whatsapp" ? "WhatsApp" : "Email";
  const who = lastAction.client_name || "client";
  return `Last action: ${channel} sent to ${who} · ${relativeTime(lastAction.sent_at)}`;
}

export function lastActionShort(
  lastAction: { channel: string; client_name: string; sent_at: string | null } | null | undefined,
): string | null {
  if (!lastAction?.sent_at) return null;
  return `last action ${relativeTime(lastAction.sent_at)}`;
}

export const CHASE_BADGE: Record<ChaseLabel, { label: string; className: string }> = {
  chasing: { label: "Chasing", className: "bg-yellow/25 text-yellow-900" },
  final_notice: { label: "Final notice", className: "bg-red/15 text-red" },
  paid: { label: "Paid", className: "bg-green/15 text-green" },
  paused: { label: "Paused", className: "bg-border text-muted" },
  disputed: { label: "Disputed", className: "bg-yellow/25 text-yellow-900" },
  queued: { label: "Queued", className: "bg-border text-muted" },
  upcoming: { label: "Upcoming", className: "bg-border text-muted" },
};

export const STATUS_COLOR: Record<string, string> = {
  paid: "text-green",
  chasing: "text-yellow-900",
  final_notice: "text-red",
  upcoming: "text-muted",
  queued: "text-muted",
  paused: "text-muted",
  disputed: "text-yellow-900",
};

export const DOT_COLOR: Record<ChaseLabel, string> = {
  chasing: "bg-yellow",
  final_notice: "bg-red",
  paid: "bg-green",
  paused: "bg-muted",
  disputed: "bg-yellow",
  queued: "bg-muted",
  upcoming: "bg-muted",
};

export function invoiceStatusText(inv: InvoiceItem): string {
  if (inv.status_text) return inv.status_text;
  if (inv.chase_label === "paid" || inv.balance <= 0) return "Paid";
  if (inv.days_overdue > 0) return `${inv.days_overdue} days overdue`;
  return "Current";
}

export function invoiceMetaLine(inv: InvoiceItem): string {
  if (inv.meta_line) return inv.meta_line;
  const doc = `INV #${inv.doc_number ?? "—"}`;
  return doc;
}

export function activityIcon(
  kind: string,
  channel?: string | null,
): { icon: "check" | "refresh" | "mail" | "whatsapp" | "info"; className: string } {
  if (kind === "payment") return { icon: "check", className: "bg-green/15 text-green" };
  if (kind === "sync") return { icon: "refresh", className: "bg-yellow/20 text-yellow-900" };
  if (kind === "auto_activated") return { icon: "refresh", className: "bg-accent/15 text-accent" };
  if (channel === "whatsapp") return { icon: "whatsapp", className: "bg-green/15 text-green" };
  if (kind === "reminder_sent") return { icon: "mail", className: "bg-accent-soft/25 text-accent" };
  return { icon: "info", className: "bg-border text-muted" };
}

export function filterInvoices(items: InvoiceItem[], filter: InvoiceFilter): InvoiceItem[] {
  if (filter === "all") return items;
  if (filter === "paid") return items.filter((i) => i.chase_label === "paid" || i.balance <= 0);
  if (filter === "chasing") {
    return items.filter((i) => i.chase_label === "chasing" || i.chase_label === "final_notice");
  }
  if (filter === "overdue") return items.filter((i) => i.days_overdue > 0 && i.balance > 0);
  return items;
}

export function filterCounts(items: InvoiceItem[]): Record<InvoiceFilter, number> {
  return {
    all: items.length,
    chasing: filterInvoices(items, "chasing").length,
    overdue: filterInvoices(items, "overdue").length,
    paid: filterInvoices(items, "paid").length,
  };
}

export function invoiceSourceOf(inv: InvoiceItem): "quickbooks" | "upload" {
  return inv.source ?? "quickbooks";
}

export function filterBySource(items: InvoiceItem[], source: InvoiceSourceFilter): InvoiceItem[] {
  if (source === "all") return items;
  return items.filter((i) => invoiceSourceOf(i) === source);
}

export function sourceFilterCounts(items: InvoiceItem[]): Record<InvoiceSourceFilter, number> {
  const quickbooks = items.filter((i) => invoiceSourceOf(i) === "quickbooks").length;
  const upload = items.filter((i) => invoiceSourceOf(i) === "upload").length;
  return { all: items.length, quickbooks, upload };
}

export const SOURCE_BADGE: Record<"quickbooks" | "upload", { label: string; className: string }> = {
  quickbooks: { label: "QB", className: "bg-green/15 text-green" },
  upload: { label: "Upload", className: "bg-amber-500/15 text-amber-900 dark:text-amber-100" },
};

export function formatMomPct(pct: number | null | undefined): string {
  if (pct == null) return "this month";
  if (pct > 0) return `↑ ${pct}% vs last month`;
  if (pct < 0) return `↓ ${Math.abs(pct)}% vs last month`;
  return "same as last month";
}

export function formatAvgDaysSub(
  delta: number | null | undefined,
  lastMonth: number | null | undefined,
): string {
  if (delta != null && lastMonth != null) {
    if (delta < 0) return `↓ from ${Math.abs(Math.round(lastMonth))} days before`;
    if (delta > 0) return `↑ from ${Math.round(lastMonth)} days before`;
    return "unchanged from last month";
  }
  return "from client history";
}

export function riskBadgeClass(level: string): string {
  if (level === "high") return "bg-red/15 text-red";
  if (level === "low") return "bg-green/15 text-green";
  return "bg-yellow/20 text-yellow-900";
}

export function alertCardStyle(kind: string, source?: string): {
  card: string;
  text: string;
  icon: string;
} {
  if (source === "escalation" || kind === "escalation") {
    return { card: "border-yellow/40 bg-yellow/10", text: "text-yellow-900", icon: "!" };
  }
  if (kind === "payment_received" || kind === "payment") {
    return { card: "border-green/30 bg-green/10", text: "text-green", icon: "✓" };
  }
  if (kind === "auto_activated") {
    return { card: "border-accent/25 bg-accent/5", text: "text-accent", icon: "↻" };
  }
  return { card: "border-border bg-card", text: "text-foreground", icon: "◉" };
}
