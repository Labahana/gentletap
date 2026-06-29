export type PlanId = "free" | "pro" | "pro_plus" | "team";

export type PlanFeature = {
  id: PlanId;
  name: string;
  price_monthly: number;
  price_annual: number;
  active_sequence_limit: number | null;
  monthly_collection_limit?: number | null;
  /** ROI or proof point under the price */
  value_note?: string;
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

export function hasWhatsapp(plan: string): boolean {
  return plan === "pro_plus" || plan === "team";
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
    value_note: "No credit card required to start",
    features: [
      "QuickBooks Online sync (read-only)",
      "CSV & Excel invoice upload",
      "Connect Gmail for sending",
      "AI-drafted payment reminder emails",
      "Preview & edit messages before they send",
      "Multi-step email sequences (due date → day 21)",
      "Pause reminders per invoice anytime",
      "Auto-stop when QuickBooks shows paid",
      "Invoice & client dashboard",
      "5 invoice collections per month",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price_monthly: 19,
    price_annual: 190,
    active_sequence_limit: null,
    value_note: "Unlimited collections — one recovered invoice pays for years",
    features: [
      "Everything in Starter",
      "Unlimited invoice collections",
      "Autonomous follow-ups (go live on autopilot)",
      "AI-personalized emails per client & invoice",
      "Sequences from due date through day 21",
      "Send from your Gmail inbox",
      "QuickBooks sync + spreadsheet re-upload",
      "Edit upcoming reminders from dashboard",
      "Per-invoice reminder history",
      "Payment-received email notifications",
      "Overdue alerts & dashboard summary",
      "Analytics — collections & month-over-month",
    ],
  },
  {
    id: "pro_plus",
    name: "Pro+",
    price_monthly: 39,
    price_annual: 390,
    active_sequence_limit: null,
    value_note: "450 WhatsApp messages/mo included",
    features: [
      "Everything in Pro",
      "WhatsApp on sequence steps 1–3",
      "450 WhatsApp reminders per month",
      "Email first, WhatsApp hours later",
      "Priority AI (GPT-4o) for sharper copy",
      "Escalation dashboard & recommendations",
      "WhatsApp credit packs (add-on)",
      "Multi-currency invoice support",
    ],
  },
  {
    id: "team",
    name: "Team",
    price_monthly: 59,
    price_annual: 590,
    active_sequence_limit: null,
    value_note: "3 seats · 850 WhatsApp/mo",
    features: [
      "Everything in Pro+",
      "850 WhatsApp reminders per month",
      "3 team seats",
      "Shared invoice & client dashboard",
      "Priority email support",
      "All Pro+ automation for the whole studio",
    ],
  },
];

/** Merge marketing copy from the catalog onto API plan rows (billing page). */
export function withPlanMarketing(plan: PlanFeature): PlanFeature {
  const catalog = PRICING_PLANS.find((p) => p.id === plan.id);
  if (!catalog) return plan;
  return {
    ...plan,
    value_note: catalog.value_note ?? plan.value_note,
    features: catalog.features.length > 0 ? catalog.features : plan.features,
  };
}

export const PRICING_VALUE_PROPS = [
  {
    title: "Stops when they pay",
    body: "QuickBooks balance hits zero → reminders stop. No awkward chase after payment.",
  },
  {
    title: "Sounds like you wrote it",
    body: "AI drafts reference each invoice and client history — warm, not collections-agency.",
  },
  {
    title: "Built for QuickBooks freelancers",
    body: "Sync unpaid invoices, send from Gmail, recover cash without damaging relationships.",
  },
] as const;
