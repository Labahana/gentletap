"use client";

import Link from "next/link";
import { DashboardShell } from "@/components/dashboard-shell";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PricingGrid } from "@/components/pricing-grid";
import { api, getToken } from "@/lib/api";
import { isUpgrade, planLabel, type PlanFeature, type PlanId } from "@/lib/pricing";
import { useAuth } from "@/lib/auth-context";

function BillingContent() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<PlanFeature[]>([]);
  const [checkoutAvailable, setCheckoutAvailable] = useState(true);
  const [annual, setAnnual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    api.billingStatus(token).then((s) => {
      setPlans(s.plans);
      setCheckoutAvailable(s.checkout_available);
    });
  }, [user]);

  const success = searchParams.get("success") === "1";
  const cancelled = searchParams.get("cancelled") === "1";

  useEffect(() => {
    if (success) {
      void refresh();
    }
  }, [success, refresh]);

  async function checkout(plan: PlanId) {
    if (plan === "free") return;
    const token = getToken();
    if (!token) return;
    setError(null);
    setBusy(plan);
    try {
      const { checkout_url } = await api.billingCheckout(token, plan, annual ? "year" : "month");
      window.location.href = checkout_url;
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

  if (loading || !user) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-40">
          <div className="h-6 w-32 animate-pulse rounded-xl bg-border" />
        </div>
      </DashboardShell>
    );
  }

  const current = user.plan as PlanId;
  const isPaid = current !== "free";

  return (
    <DashboardShell>
      <div className="px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Billing & plan</h1>
            <p className="mt-1 text-sm text-muted">
              Current plan: <span className="font-medium text-foreground">{planLabel(current)}</span>
            </p>
          </div>
          {isPaid && (
            <button type="button" className="btn-secondary py-2 text-sm" onClick={manage}>
              Manage subscription
            </button>
          )}
        </div>

        {success && (
          <p className="mt-5 rounded-xl border border-green/30 bg-green/5 px-5 py-3 text-sm text-green">
            Subscription updated — welcome to {planLabel(current)}!
          </p>
        )}

        {cancelled && (
          <p className="mt-5 rounded-xl border border-border bg-background px-5 py-3 text-sm text-muted">
            Checkout cancelled — no changes were made.
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-xl border border-red/30 bg-red/5 px-5 py-3 text-sm text-red">{error}</p>
        )}

        {!checkoutAvailable && (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
            Paddle checkout is not configured yet. Add price IDs to your environment to enable upgrades.
          </p>
        )}

        <div className="mt-8">
          <PricingGrid
            plans={plans}
            currentPlan={current}
            annual={annual}
            onToggleAnnual={() => setAnnual((v) => !v)}
            onSelectPlan={(planId) => {
              if (isUpgrade(current, planId)) checkout(planId);
            }}
          />
        </div>

        {busy && <p className="mt-4 text-center text-sm text-muted">Redirecting to checkout…</p>}
      </div>
    </DashboardShell>
  );
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={
      <DashboardShell>
        <div className="flex items-center justify-center py-40">
          <div className="h-6 w-32 animate-pulse rounded-xl bg-border" />
        </div>
      </DashboardShell>
    }>
      <BillingContent />
    </Suspense>
  );
}
