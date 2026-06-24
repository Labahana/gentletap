import Link from "next/link";
import type { ReactNode } from "react";

export function formatAdminDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function AdminStatCard({
  label,
  value,
  warn,
  href,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
  href?: string;
}) {
  const inner = (
    <div
      className={`rounded-lg border p-4 transition ${
        warn ? "border-amber-500/40 bg-amber-500/5" : "border-slate-800 bg-slate-900"
      } ${href ? "hover:border-slate-600" : ""}`}
    >
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function AdminBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "error" | "accent";
}) {
  const tones = {
    neutral: "bg-slate-800 text-slate-300",
    ok: "bg-emerald-500/15 text-emerald-300",
    warn: "bg-amber-500/15 text-amber-300",
    error: "bg-red-500/15 text-red-300",
    accent: "bg-amber-500/20 text-amber-200",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function AdminSection({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-slate-800 bg-slate-900 ${className}`}>
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-medium text-slate-200">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function AdminAlert({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const styles = {
    error: "border-red-500/30 bg-red-500/10 text-red-300",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    info: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };
  return <p className={`mb-4 rounded-md border px-3 py-2 text-sm ${styles[tone]}`}>{children}</p>;
}

export function AdminButton({
  children,
  onClick,
  disabled,
  variant = "default",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
}) {
  const styles = {
    default: "border border-slate-700 text-slate-200 hover:bg-slate-800",
    primary: "bg-amber-600 text-white hover:bg-amber-500",
    danger: "border border-red-600/50 text-red-300 hover:bg-red-600/10",
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="min-w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function AdminEmpty({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{message}</p>;
}

export function AdminPagination({
  total,
  limit,
  offset,
  onPage,
}: {
  total: number;
  limit: number;
  offset: number;
  onPage: (nextOffset: number) => void;
}) {
  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
      <span>
        {total === 0 ? "No results" : `${offset + 1}–${Math.min(offset + limit, total)} of ${total}`}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canPrev}
          onClick={() => onPage(Math.max(0, offset - limit))}
          className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40"
        >
          Previous
        </button>
        <span className="px-2 py-1">
          Page {page} / {pages}
        </span>
        <button
          type="button"
          disabled={!canNext}
          onClick={() => onPage(offset + limit)}
          className="rounded border border-slate-700 px-2 py-1 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function AdminLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-slate-400">
      Loading…
    </div>
  );
}

export function connectionTone(connected: boolean): "ok" | "neutral" {
  return connected ? "ok" : "neutral";
}
