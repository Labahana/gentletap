/** Public affiliate program constants — keep in sync with API settings defaults. */
export const AFFILIATE_COMMISSION_MONTHS = 24;
export const AFFILIATE_COMMISSION_RATE = 0.3;

/** Discount for customers who sign up through an affiliate link (first N paid months). */
export const AFFILIATE_REFERRAL_DISCOUNT_PERCENT = 20;
export const AFFILIATE_REFERRAL_DISCOUNT_MONTHS = 3;

export function maxCommissionPerPlan(monthlyPrice: number): number {
  return monthlyPrice * AFFILIATE_COMMISSION_RATE * AFFILIATE_COMMISSION_MONTHS;
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
