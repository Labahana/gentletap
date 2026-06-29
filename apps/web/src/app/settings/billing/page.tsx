"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PricingGrid } from "@/components/pricing-grid";
import { api, getToken } from "@/lib/api";
import { isUpgrade, planLabel, withPlanMarketing, type PlanFeature, type PlanId } from "@/lib/pricing";
import { openOverlayCheckout, type PaddlePublicConfig } from "@/lib/paddle";
import { useAuth } from "@/lib/auth-context";

function BillingContent() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanFeature[]>([]);
  const [checkoutAvailable, setCheckoutAvailable] = useState(true);
  const [paddleConfig, setPaddleConfig] = useState<PaddlePublicConfig | null>(null);
  const [annual, setAnnual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.billingStatus(token).then((s) => {
      setPlans(s.plans.map((p) => withPlanMarketing(p as PlanFeature)));
      setCheckoutAvailable(s.checkout_available);
      setPaddleConfig(s.paddle);
    });
  }, [user]);

  const success = searchParams.get("success") === "1";
  const cancelled = searchParams.get("cancelled") === "1";

  useEffect(() => {
    if (success) void refresh();
  }, [success, refresh]);

  async function checkout(plan: PlanId) {
    if (plan === "free") return;
    const token = getToken();
    if (!token) return;
    setError(null);
    setBusy(plan);
    try {
      const { checkout_url, transaction_id } = await api.billingCheckout(
        token,
        plan,
        annual ? "year" : "month",
      );
      const opened =
        paddleConfig != null &&
        (await openOverlayCheckout({
          config: paddleConfig,
          transactionId: transaction_id,
          successUrl: `${window.location.origin}/settings/billing?success=1`,
          onComplete: () => {
            void refresh();
            router.replace("/settings/billing?success=1");
          },
        }));
      if (!opened) {
        if (!checkout_url) throw new Error("Checkout is not available — please try again later");
        window.location.href = checkout_url;
        return;
      }
      setBusy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(null);
    }
  }

  async function manage() {
    const token = getToken();
    if (!token) return;
    try {
      const { portal_url } = await api.billingPortal(token);
      window.location.href = portal_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Portal unavailable");
    }
  }

  if (!user) return null;

  const current = user.plan as PlanId;
  const isPaid = current !== "free";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Plans & billing</h2>
          <p className="mt-1.5 text-sm text-muted">
            You&apos;re on{" "}
            <span className="inline-flex items-center rounded-full bg-accent/12 px-2.5 py-0.5 text-xs font-semibold text-accent">
              {planLabel(current)}
            </span>
            {isPaid && " — renews automatically until you cancel"}
          </p>
        </div>
        {isPaid && (
          <button
            type="button"
            className="btn-secondary shrink-0 px-4 py-2 text-sm"
            onClick={manage}
          >
            Manage subscription
          </button>
        )}
      </div>

      {success && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green/25 bg-green/5 px-5 py-4">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green/15 text-sm text-green">
            ✓
          </span>
          <p className="text-sm text-green">
            <span className="font-semibold">Payment successful.</span> Welcome to {planLabel(current)} —
            your plan is active.
          </p>
        </div>
      )}

      {cancelled && (
        <p className="mt-6 rounded-2xl border border-border bg-background px-5 py-4 text-sm text-muted">
          Checkout cancelled — no changes were made.
        </p>
      )}

      {error && (
        <p className="mt-6 rounded-2xl border border-red/25 bg-red/5 px-5 py-4 text-sm text-red">{error}</p>
      )}

      {!checkoutAvailable && (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Paddle checkout is not configured yet. Add price IDs to your environment to enable upgrades.
        </p>
      )}

      <div className="mt-10">
        <PricingGrid
          plans={plans}
          currentPlan={current}
          annual={annual}
          onAnnualChange={setAnnual}
          onSelectPlan={(planId) => {
            if (isUpgrade(current, planId)) checkout(planId);
          }}
        />
      </div>

      {busy && (
        <p className="mt-6 text-center text-sm text-muted animate-pulse">
          Opening secure checkout…
        </p>
      )}
    </div>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-border" />}>
      <BillingContent />
    </Suspense>
  );
}
