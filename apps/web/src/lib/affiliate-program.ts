/** Public affiliate program constants — keep in sync with API `affiliate_commission_months` default. */
export const AFFILIATE_COMMISSION_MONTHS = 24;
export const AFFILIATE_COMMISSION_RATE = 0.3;

export function maxCommissionPerPlan(monthlyPrice: number): number {
  return monthlyPrice * AFFILIATE_COMMISSION_RATE * AFFILIATE_COMMISSION_MONTHS;
}
