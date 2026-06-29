"use client";

import { IconCheck } from "@tabler/icons-react";
import Link from "next/link";
import { BillingIntervalToggle } from "@/components/billing-interval-toggle";
import { type PlanFeature, isUpgrade, planLabel } from "@/lib/pricing";

type Props = {
  plans?: PlanFeature[];
  currentPlan?: string;
  annual?: boolean;
  onToggleAnnual?: () => void;
  onAnnualChange?: (annual: boolean) => void;
  onSelectPlan?: (planId: "pro" | "pro_plus" | "team") => void;
  onSelectFree?: () => void;
  freeCta?: string;
  compact?: boolean;
  highlightPlan?: string;
  invoiceCount?: number;
};

function PlanBadge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "accent" }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
        variant === "accent"
          ? "bg-accent text-white"
          : "bg-foreground/[0.06] text-muted"
      }`}
    >
      {children}
    </span>
  );
}

export function PricingGrid({
  plans,
  currentPlan = "free",
  annual = false,
  onToggleAnnual,
  onAnnualChange,
  onSelectPlan,
  onSelectFree,
  freeCta,
  compact = false,
  highlightPlan,
  invoiceCount,
}: Props) {
  const items = plans ?? [];
  const showIntervalToggle = Boolean(onAnnualChange ?? onToggleAnnual);

  function setAnnual(next: boolean) {
    if (onAnnualChange) {
      onAnnualChange(next);
      return;
    }
    if (onToggleAnnual && next !== annual) onToggleAnnual();
  }

  return (
    <div>
      {showIntervalToggle && (
        <div className="mb-10">
          <BillingIntervalToggle annual={annual} onChange={setAnnual} />
          <p className="mt-3 text-center text-xs text-muted">
            {annual
              ? "Prices shown as monthly equivalent — billed once per year"
              : "Switch to annual billing and save about 17%"}
          </p>
        </div>
      )}

      <div
        className={`grid gap-5 ${compact ? "md:grid-cols-2" : "sm:grid-cols-2 xl:grid-cols-4"}`}
      >
        {items.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const annualTotal = plan.price_annual;
          const perMonth =
            plan.id === "free"
              ? 0
              : annual
                ? Math.round(plan.price_annual / 12)
                : plan.price_monthly;
          const canCheckout =
            plan.id !== "free" &&
            (annual ? plan.checkout_annual_available : plan.checkout_monthly_available);
          const showUpgrade =
            onSelectPlan &&
            canCheckout &&
            !isCurrent &&
            isUpgrade(currentPlan, plan.id as "pro" | "pro_plus" | "team");

          const isHighlighted =
            highlightPlan === plan.id ||
            (highlightPlan === undefined && plan.id === "pro_plus" && !isCurrent);
          const proInvoiceNote =
            plan.id === "pro" && invoiceCount != null && invoiceCount > 0
              ? `Activate all ${invoiceCount} invoices`
              : null;
          const freeNote =
            plan.id === "free" && invoiceCount != null && invoiceCount > 5
              ? `Up to 5 of ${invoiceCount} invoices`
              : plan.id === "free" && invoiceCount != null && invoiceCount > 0
                ? `Up to ${Math.min(5, invoiceCount)} invoices`
                : null;

          return (
            <div
              key={plan.id}
              className={`group relative flex flex-col rounded-2xl border bg-card p-6 transition-all duration-200 ${
                isCurrent
                  ? "border-accent shadow-lg shadow-accent/10 ring-1 ring-accent/30"
                  : isHighlighted
                    ? "border-accent/35 shadow-md shadow-accent/5"
                    : "border-border shadow-sm hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md"
              }`}
            >
              {isHighlighted && (
                <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-accent to-accent-soft" />
              )}

              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{plan.name}</h3>
                  {proInvoiceNote && (
                    <p className="mt-1 text-xs font-medium text-accent">{proInvoiceNote}</p>
                  )}
                  {freeNote && <p className="mt-1 text-xs text-muted">{freeNote}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {isCurrent && <PlanBadge variant="accent">Current</PlanBadge>}
                  {plan.id === "pro_plus" && !isCurrent && !highlightPlan && (
                    <PlanBadge>Popular</PlanBadge>
                  )}
                  {plan.id === "pro" && highlightPlan === "pro" && !isCurrent && (
                    <PlanBadge>Best fit</PlanBadge>
                  )}
                </div>
              </div>

              <div className="mt-5">
                {plan.id === "free" ? (
                  <p className="text-3xl font-bold tracking-tight">Free</p>
                ) : (
                  <>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight">${perMonth}</span>
                      <span className="text-sm font-medium text-muted">/mo</span>
                    </div>
                    {annual ? (
                      <p className="mt-1.5 text-xs text-muted">
                        <span className="font-medium text-foreground">${annualTotal}</span> billed yearly
                      </p>
                    ) : (
                      <p className="mt-1.5 text-xs text-muted">
                        or ${Math.round(plan.price_annual / 12)}/mo billed annually
                      </p>
                    )}
                  </>
                )}
                {plan.value_note && (
                  <p className="mt-3 rounded-lg bg-accent/8 px-2.5 py-2 text-xs leading-snug text-foreground/85">
                    {plan.value_note}
                  </p>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/12 text-accent">
                      <IconCheck size={12} stroke={2.5} />
                    </span>
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                {plan.id === "free" ? (
                  onSelectFree ? (
                    <button type="button" className="btn-secondary w-full" onClick={onSelectFree}>
                      {freeCta ?? "Start free"}
                    </button>
                  ) : onSelectPlan ? null : (
                    <Link href="/signup" className="btn-secondary block w-full text-center">
                      Start free
                    </Link>
                  )
                ) : showUpgrade ? (
                  <button
                    type="button"
                    className={
                      isHighlighted || plan.id === "pro_plus"
                        ? "btn-primary w-full"
                        : "btn-secondary w-full"
                    }
                    onClick={() => onSelectPlan!(plan.id as "pro" | "pro_plus" | "team")}
                  >
                    {plan.id === "pro" && invoiceCount
                      ? `Activate all ${invoiceCount} — ${plan.name}`
                      : `Upgrade to ${plan.name}`}
                  </button>
                ) : onSelectPlan && isCurrent ? (
                  <div className="rounded-xl bg-foreground/[0.04] py-2.5 text-center text-sm font-medium text-muted">
                    Your plan
                  </div>
                ) : onSelectPlan ? (
                  <div className="py-2.5 text-center text-sm text-muted">—</div>
                ) : (
                  <Link
                    href="/signup"
                    className={
                      plan.id === "pro_plus"
                        ? "btn-primary block w-full text-center"
                        : "btn-secondary block w-full text-center"
                    }
                  >
                    Get started
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { planLabel };
