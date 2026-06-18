import type { User } from "./api";

export function isOnboardingComplete(user: Pick<User, "onboarding_step" | "onboarding_completed_at">): boolean {
  return user.onboarding_step === "live" || user.onboarding_completed_at != null;
}

export function postAuthPath(user: Pick<User, "onboarding_step" | "onboarding_completed_at">): string {
  return isOnboardingComplete(user) ? "/dashboard" : "/onboarding";
}

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Human-readable "12m ago" from ISO timestamp */
export function formatLastSync(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function autoSyncStatusLine(lastSyncAt: string | null | undefined): string {
  const last = formatLastSync(lastSyncAt);
  if (last) return `QuickBooks syncs automatically every 30 min · last sync ${last}`;
  return "QuickBooks syncs automatically every 30 min";
}
