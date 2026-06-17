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
