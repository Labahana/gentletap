/** Public affiliate program constants — keep in sync with API settings defaults. */
export const AFFILIATE_COMMISSION_MONTHS = 24;
export const AFFILIATE_COMMISSION_RATE = 0.3;

/** One-time bounty: share of a referral's first paid month. */
export const AFFILIATE_FIRST_MONTH_RATE = 0.5;

/** Performance tiers on month-to-date referred revenue (renewals). */
export const AFFILIATE_TIERS = [
  { minMonthlyRevenue: 0, rate: 0.3 },
  { minMonthlyRevenue: 500, rate: 0.35 },
  { minMonthlyRevenue: 2000, rate: 0.4 },
] as const;

export const AFFILIATE_COOKIE_DAYS = 60;
export const AFFILIATE_PAYOUT_MINIMUM = 20;
export const AFFILIATE_PAYOUT_SCHEDULE = "net 15";
export const AFFILIATE_PAYOUT_METHODS_LABEL = "PayPal, Wise, or bank transfer";

/** First 25 approved affiliates get a 40% manual rate for their first 6 months. */
export const AFFILIATE_FOUNDER_TIER_SPOTS = 25;
export const AFFILIATE_FOUNDER_TIER_RATE = 0.4;
export const AFFILIATE_FOUNDER_TIER_MONTHS = 6;

/** Discount for customers who sign up through an affiliate link (first N paid months). */
export const AFFILIATE_REFERRAL_DISCOUNT_PERCENT = 20;
export const AFFILIATE_REFERRAL_DISCOUNT_MONTHS = 3;

/** First-month bounty + recurring commissions over the full window (undiscounted list price). */
export function maxCommissionPerPlan(monthlyPrice: number): number {
  return (
    monthlyPrice * AFFILIATE_FIRST_MONTH_RATE +
    monthlyPrice * AFFILIATE_COMMISSION_RATE * (AFFILIATE_COMMISSION_MONTHS - 1)
  );
}

export function firstMonthCommission(monthlyPrice: number): number {
  return monthlyPrice * AFFILIATE_FIRST_MONTH_RATE;
}

export function referralDiscountLabel(): string {
  return `${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off your first ${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} months`;
}

export function referralDiscountShort(): string {
  return `${AFFILIATE_REFERRAL_DISCOUNT_PERCENT}% off (${AFFILIATE_REFERRAL_DISCOUNT_MONTHS} mo)`;
}

/** Copy affiliates can paste into YouTube descriptions. */
export function affiliatePromoBlurb(refCode: string, webUrl: string): string {
  const link = `${webUrl.replace(/\/$/, "")}/signup?ref=${encodeURIComponent(refCode)}`;
  return (
    `Try GentleTap — automated QuickBooks invoice follow-ups that sound like you: ${link}\n` +
    `Use my link for ${referralDiscountLabel()} on paid plans. I earn a commission if you subscribe.`
  );
}
