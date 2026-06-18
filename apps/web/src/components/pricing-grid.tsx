"use client";

import Link from "next/link";
import { type PlanFeature, isUpgrade, planLabel } from "@/lib/pricing";

type Props = {
  plans?: PlanFeature[];
  currentPlan?: string;
  annual?: boolean;
  onToggleAnnual?: () => void;
  onSelectPlan?: (planId: "pro" | "pro_plus" | "team") => void;
  onSelectFree?: () => void;
  freeCta?: string;
  compact?: boolean;
  highlightPlan?: string;
  invoiceCount?: number;
};

export function PricingGrid({
  plans,
  currentPlan = "free",
  annual = false,
  onToggleAnnual,
  onSelectPlan,
  onSelectFree,
  freeCta,
  compact = false,
  highlightPlan,
  invoiceCount,
}: Props) {
  const items = plans ?? [];

  return (
    <div>
      {onToggleAnnual && (
        <div className="mb-8 flex items-center justify-center gap-3 text-sm">
          <button
            type="button"
            className={!annual ? "font-semibold text-foreground" : "text-muted"}
            onClick={() => annual && onToggleAnnual()}
          >
            Monthly
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={annual}
            className="relative h-6 w-11 rounded-full bg-border"
            onClick={onToggleAnnual}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-accent transition-transform ${
                annual ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <button
            type="button"
            className={annual ? "font-semibold text-foreground" : "text-muted"}
            onClick={() => !annual && onToggleAnnual()}
          >
            Annual <span className="text-accent">(save ~17%)</span>
          </button>
        </div>
      )}

      <div
        className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"}`}
      >
        {items.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = annual ? plan.price_annual : plan.price_monthly;
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

          const isHighlighted = highlightPlan === plan.id || (highlightPlan === undefined && plan.id === "pro_plus");
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
              className={`card flex flex-col ${isCurrent ? "ring-2 ring-accent" : ""} ${
                isHighlighted ? "border-accent/40 bg-accent/5" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{plan.name}</h3>
                {isCurrent && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    Current
                  </span>
                )}
                {plan.id === "pro_plus" && !isCurrent && !highlightPlan && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    Popular
                  </span>
                )}
                {plan.id === "pro" && highlightPlan === "pro" && !isCurrent && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                    Best fit
                  </span>
                )}
              </div>

              {proInvoiceNote && (
                <p className="mt-2 text-sm font-medium text-accent">{proInvoiceNote}</p>
              )}
              {freeNote && <p className="mt-2 text-sm text-muted">{freeNote}</p>}

              <p className="mt-3 text-3xl font-bold">
                {plan.id === "free" ? (
                  "Free"
                ) : (
                  <>
                    ${perMonth}
                    <span className="text-base font-normal text-muted">/mo</span>
                  </>
                )}
              </p>
              {annual && plan.id !== "free" && (
                <p className="text-xs text-muted">${price}/yr billed annually</p>
              )}

              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-accent">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
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
                    className={isHighlighted ? "btn-primary w-full" : "btn-secondary w-full"}
                    onClick={() => onSelectPlan!(plan.id as "pro" | "pro_plus" | "team")}
                  >
                    {plan.id === "pro" && invoiceCount
                      ? `Activate all ${invoiceCount} — ${plan.name}`
                      : `Upgrade to ${plan.name}`}
                  </button>
                ) : onSelectPlan && isCurrent ? (
                  <p className="text-center text-sm text-muted">Your plan</p>
                ) : onSelectPlan ? (
                  <p className="text-center text-sm text-muted">—</p>
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
