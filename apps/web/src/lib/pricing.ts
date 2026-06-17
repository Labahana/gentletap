export type PlanId = "free" | "pro" | "pro_plus" | "team";

export type PlanFeature = {
  id: PlanId;
  name: string;
  price_monthly: number;
  price_annual: number;
  active_sequence_limit: number | null;
  monthly_collection_limit?: number | null;
  features: string[];
  checkout_monthly_available: boolean;
  checkout_annual_available: boolean;
};

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  pro: 1,
  pro_plus: 2,
  team: 3,
};

export function planLabel(plan: string): string {
  const labels: Record<string, string> = {
    free: "Starter",
    pro: "Pro",
    pro_plus: "Pro+",
    team: "Team",
  };
  return labels[plan] ?? plan;
}

export function isUpgrade(from: string, to: PlanId): boolean {
  const a = PLAN_RANK[(from as PlanId) in PLAN_RANK ? (from as PlanId) : "free"];
  const b = PLAN_RANK[to];
  return b > a;
}

export const PRICING_PLANS: Omit<
  PlanFeature,
  "checkout_monthly_available" | "checkout_annual_available"
>[] = [
  {
    id: "free",
    name: "Starter",
    price_monthly: 0,
    price_annual: 0,
    active_sequence_limit: null,
    monthly_collection_limit: 5,
    features: [
      "QuickBooks sync",
      "AI reminder previews",
      "Email reminders",
      "5 invoice collections per month",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price_monthly: 19,
    price_annual: 190,
    active_sequence_limit: null,
    features: [
      "Unlimited sequences",
      "Autonomous follow-ups",
      "AI-personalized email",
      "Send from Gmail",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro+",
    price_monthly: 39,
    price_annual: 390,
    active_sequence_limit: null,
    features: [
      "Everything in Pro",
      "450 WhatsApp/month (steps 1–3)",
      "Email first, WhatsApp hours later",
      "Priority AI (GPT-4o)",
      "Escalation dashboard",
    ],
  },
  {
    id: "team",
    name: "Team",
    price_monthly: 59,
    price_annual: 590,
    active_sequence_limit: null,
    features: [
      "Everything in Pro+",
      "850 WhatsApp/month",
      "3 team seats",
      "Shared dashboard",
      "Priority support",
    ],
  },
];
