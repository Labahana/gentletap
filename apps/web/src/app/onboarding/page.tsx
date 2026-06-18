"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { PricingGrid } from "@/components/pricing-grid";
import { api, getToken, type ReminderPreviewItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/lib/onboarding";
import type { PlanFeature } from "@/lib/pricing";

const STEPS = [
  { id: "persona", title: "Tell us about you" },
  { id: "email", title: "Connect email" },
  { id: "quickbooks", title: "Connect QuickBooks" },
  { id: "preview", title: "Your reminders" },
  { id: "pricing", title: "Choose your plan" },
];

const FREE_MONTHLY_LIMIT = 5;

/** Map backend onboarding_step → UI step index */
const BACKEND_STEP_INDEX: Record<string, number> = {
  account: 0,
  persona: 0,
  email: 1,
  quickbooks: 2,
  import: 3,
  preview: 3,
  pricing: 4,
};

type ImportSummary = {
  count: number;
  total: number;
  message: string;
  syncing: boolean;
};

function OnboardingContent() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [persona, setPersona] = useState("freelancer");
  const [previews, setPreviews] = useState<ReminderPreviewItem[]>([]);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbError, setQbError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [emailReady, setEmailReady] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activateNote, setActivateNote] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary>({
    count: 0,
    total: 0,
    message: "Connect QuickBooks to import your unpaid invoices",
    syncing: false,
  });
  const [plans, setPlans] = useState<PlanFeature[]>([]);
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  const [annual, setAnnual] = useState(false);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/signup");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    if (user.onboarding_step === "live" || user.onboarding_completed_at) {
      router.replace("/dashboard");
      return;
    }
    const idx = BACKEND_STEP_INDEX[user.onboarding_step];
    if (idx !== undefined) setStep(idx);
  }, [user, router]);

  useEffect(() => {
    const qb = searchParams.get("qb");
    const email = searchParams.get("email");
    const message = searchParams.get("message");
    const paid = searchParams.get("paid");
    const checkout = searchParams.get("checkout");

    if (qb === "connected") {
      setStep(3);
      setImportSummary((s) => ({ ...s, message: "Syncing invoices from QuickBooks…", syncing: true }));
      router.replace("/onboarding");
    } else if (qb === "error") {
      setStep(2);
      setQbError(message ?? "QuickBooks connection failed");
      router.replace("/onboarding");
    } else if (email === "connected") {
      setStep(2);
      router.replace("/onboarding");
    } else if (email === "error") {
      setStep(1);
      setEmailError(message ?? "Email connection failed");
      router.replace("/onboarding");
    } else if (paid === "1") {
      router.replace("/onboarding");
    } else if (checkout === "cancelled") {
      setStep(4);
      setEmailError("Checkout cancelled — pick a plan or start free.");
      router.replace("/onboarding");
    }
  }, [searchParams, router]);

  // After paid checkout, refresh plan and activate
  useEffect(() => {
    if (searchParams.get("paid") !== "1" || !user) return;
    const token = getToken();
    if (!token) return;

    (async () => {
      // Wait for Paddle webhook to update plan (up to ~30s)
      for (let i = 0; i < 15; i += 1) {
        const me = await api.me(token);
        if (me.plan !== "free") break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      await refresh();
      setStep(4);
      try {
        const result = await api.onboardingActivate(token);
        await refresh();
        const note = buildActivateNote(result);
        if (note) sessionStorage.setItem("onboarding_note", note);
        router.replace("/dashboard");
      } catch (err) {
        setEmailError(err instanceof Error ? err.message : "Could not activate reminders");
      }
    })();
  }, [searchParams, user, refresh, router]);

  const pollImportStatus = useCallback(async () => {
    const token = getToken();
    if (!token) return false;
    try {
      const [sync, summary] = await Promise.all([
        api.qbSyncStatus(token),
        api.invoicesSummary(token),
      ]);
      const syncing = sync.status === "syncing";
      setImportSummary({
        count: summary.unpaid_count || sync.unpaid_count || 0,
        total: summary.total_outstanding || sync.total_outstanding || 0,
        message: sync.message,
        syncing,
      });
      return syncing;
    } catch {
      setImportSummary((s) => ({ ...s, message: "Could not load sync status", syncing: false }));
      return false;
    }
  }, []);

  useEffect(() => {
    if (step !== 3) return;
    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;
    (async () => {
      const syncing = await pollImportStatus();
      if (!active) return;
      if (syncing) {
        interval = setInterval(async () => {
          const again = await pollImportStatus();
          if (!again && interval) clearInterval(interval);
        }, 2000);
      }
    })();
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [step, pollImportStatus]);

  useEffect(() => {
    if (step !== 3) return;
    const token = getToken();
    if (!token) return;
    api.remindersPreview(token).then((r) => setPreviews(r.items)).catch(() => setPreviews([]));
  }, [step, importSummary.syncing]);

  useEffect(() => {
    if (step !== 1) return;
    const token = getToken();
    if (!token) return;
    api.emailStatus(token).then((s) => setEmailReady(s.ready)).catch(() => setEmailReady(false));
  }, [step]);

  useEffect(() => {
    if (step !== 4) return;
    const token = getToken();
    if (!token) return;
    api.billingStatus(token).then((s) => {
      setPlans(s.plans);
      setCheckoutAvailable(s.checkout_available);
    });
    pollImportStatus();
  }, [step, pollImportStatus]);

  function buildActivateNote(result: {
    activated: number;
    plan_cap_total: number;
    plan_cap_remaining: number;
    skipped_escalation: unknown[];
    skipped_other: unknown[];
  }): string | null {
    const parts: string[] = [];
    if (result.plan_cap_total && result.plan_cap_remaining === 0) {
      parts.push(
        `Starter plan: ${result.plan_cap_total} collections/month used. Upgrade anytime for the rest.`,
      );
    }
    const skipped = result.skipped_escalation.length + result.skipped_other.length;
    if (skipped > 0) {
      parts.push(`${skipped} invoice(s) skipped — see dashboard for details.`);
    }
    return parts.length > 0 ? `Activated ${result.activated}. ${parts.join(" ")}` : null;
  }

  async function savePersona() {
    const token = getToken();
    if (!token) return;
    await api.setPersona(token, persona);
    await refresh();
    setStep(1);
  }

  async function connectQuickBooks() {
    const token = getToken();
    if (!token) return;
    setQbConnecting(true);
    setQbError(null);
    try {
      const { authorization_url } = await api.qbConnectUrl(token);
      window.location.href = authorization_url;
    } catch (err) {
      setQbError(err instanceof Error ? err.message : "Failed to start QuickBooks connection");
      setQbConnecting(false);
    }
  }

  async function connectGmail() {
    const token = getToken();
    if (!token) return;
    setEmailError(null);
    try {
      const { authorization_url } = await api.googleConnectUrl(token);
      window.location.href = authorization_url;
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to start Gmail connection");
    }
  }

  async function verifyResend() {
    const token = getToken();
    if (!token || !resendEmail) return;
    setEmailError(null);
    try {
      await api.verifyResendSender(token, resendEmail);
      for (let attempt = 0; attempt < 30; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const status = await api.resendSenderStatus(token);
        if (status.verified) {
          await refresh();
          setStep(2);
          return;
        }
      }
      setEmailError("Verification pending — check your inbox, then reload this page.");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function continueFromEmail() {
    if (!emailReady) return;
    const token = getToken();
    if (token) await refresh();
    setStep(2);
  }

  async function goToPricing() {
    const token = getToken();
    if (token) {
      await api.advanceOnboardingPricing(token);
      await refresh();
    }
    setStep(4);
  }

  async function activateFree() {
    const token = getToken();
    if (!token) return;
    setActivating(true);
    setEmailError(null);
    try {
      const result = await api.onboardingActivate(token);
      await refresh();
      const note = buildActivateNote(result);
      if (note) sessionStorage.setItem("onboarding_note", note);
      router.push("/dashboard");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Could not activate reminders");
      setActivating(false);
    }
  }

  async function checkoutPaid(plan: "pro" | "pro_plus" | "team") {
    const token = getToken();
    if (!token) return;
    setEmailError(null);
    setBusyPlan(plan);
    try {
      const { checkout_url } = await api.billingCheckout(
        token,
        plan,
        annual ? "year" : "month",
        "onboarding",
      );
      window.location.href = checkout_url;
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Checkout failed");
      setBusyPlan(null);
    }
  }

  if (loading || !user) {
    return <div className="flex min-h-full items-center justify-center text-muted">Loading…</div>;
  }

  const invoiceCount = importSummary.count;
  const showProHighlight = invoiceCount > FREE_MONTHLY_LIMIT;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">
          Gentle<span className="text-accent">Tap</span>
        </Link>
        <span className="text-sm text-muted">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full bg-accent transition-all"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className="card">
        <h1 className="text-2xl font-bold">{STEPS[step].title}</h1>

        {/* Step 0: Persona */}
        {step === 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">We&apos;ll tailor tone and timing to how you work.</p>
            {(["freelancer", "consultant", "agency"] as const).map((p) => (
              <label
                key={p}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 capitalize ${
                  persona === p ? "border-accent bg-accent/5" : "border-border"
                }`}
              >
                <input type="radio" name="persona" checked={persona === p} onChange={() => setPersona(p)} />
                {p}
              </label>
            ))}
            <button onClick={savePersona} className="btn-primary mt-4 w-full">
              Continue
            </button>
          </div>
        )}

        {/* Step 1: Email */}
        {step === 1 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Reminders send from your inbox — clients see your name, not a robot.
            </p>
            {emailError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailError}</p>
            )}
            {emailReady && (
              <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Email connected — you&apos;re ready to send.
              </p>
            )}
            <button className="card w-full text-left hover:border-accent" onClick={connectGmail}>
              <p className="font-semibold">Connect Gmail</p>
              <p className="mt-1 text-sm text-muted">One click · sends from your inbox</p>
            </button>
            <div className="card space-y-3">
              <p className="font-semibold">Use your domain email (Resend)</p>
              <input
                type="email"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                placeholder="you@yourdomain.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
              />
              <button className="btn-secondary w-full text-sm" onClick={verifyResend} disabled={!resendEmail}>
                Send verification link
              </button>
            </div>
            <button
              className="btn-primary w-full"
              onClick={continueFromEmail}
              disabled={!emailReady}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: QuickBooks */}
        {step === 2 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Read-only access to unpaid invoices. We import balances automatically — nothing gets changed in
              QuickBooks.
            </p>
            {qbError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{qbError}</p>
            )}
            <button className="btn-primary w-full" onClick={connectQuickBooks} disabled={qbConnecting}>
              {qbConnecting ? "Redirecting to QuickBooks…" : "Connect QuickBooks"}
            </button>
          </div>
        )}

        {/* Step 3: AHA moment */}
        {step === 3 && (
          <div className="mt-6 space-y-6">
            {importSummary.syncing ? (
              <div className="rounded-xl bg-background p-10 text-center">
                <p className="text-sm text-muted animate-pulse">Syncing from QuickBooks…</p>
              </div>
            ) : (
              <div className="rounded-xl border border-accent/30 bg-accent/5 p-8 text-center">
                <p className="text-sm font-medium uppercase tracking-wide text-accent">We found</p>
                <p className="mt-2 text-5xl font-bold text-foreground">{invoiceCount}</p>
                <p className="text-lg text-muted">
                  unpaid invoice{invoiceCount === 1 ? "" : "s"}
                </p>
                <p className="mt-4 text-3xl font-semibold">
                  {formatMoney(importSummary.total)}
                </p>
                <p className="text-sm text-muted">total outstanding</p>
              </div>
            )}

            {!importSummary.syncing && previews.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Here&apos;s what GentleTap will send — AI-drafted, in your voice:
                </p>
                {previews.slice(0, 3).map((p) => (
                  <div key={p.invoice_id} className="rounded-xl bg-background p-4 text-sm">
                    <p className="text-xs text-muted">
                      {p.client_name} · #{p.doc_number} · {formatMoney(p.balance)} · {p.days_overdue}d overdue
                    </p>
                    {p.error ? (
                      <p className="mt-2 text-red-600">{p.error}</p>
                    ) : (
                      <>
                        {p.subject && <p className="mt-2 font-medium">{p.subject}</p>}
                        <pre className="mt-1 whitespace-pre-wrap font-sans leading-relaxed text-muted">
                          {p.body}
                        </pre>
                      </>
                    )}
                  </div>
                ))}
                {invoiceCount > 3 && (
                  <p className="text-center text-sm text-muted">
                    + {invoiceCount - 3} more invoice{invoiceCount - 3 === 1 ? "" : "s"} ready to go
                  </p>
                )}
              </div>
            )}

            {!importSummary.syncing && invoiceCount === 0 && (
              <p className="text-sm text-muted">
                No unpaid invoices found yet. You can still continue — add invoices in QuickBooks and we&apos;ll sync
                them.
              </p>
            )}

            <button
              className="btn-primary w-full"
              onClick={goToPricing}
              disabled={importSummary.syncing}
            >
              {invoiceCount > 0
                ? `Activate ${invoiceCount} reminder${invoiceCount === 1 ? "" : "s"}`
                : "Choose your plan"}
            </button>
          </div>
        )}

        {/* Step 4: Pricing */}
        {step === 4 && (
          <div className="mt-6 space-y-6">
            {invoiceCount > 0 && (
              <div className="rounded-xl bg-background p-6 text-center">
                <p className="text-lg font-semibold">
                  To activate {invoiceCount === 1 ? "this reminder" : `all ${invoiceCount} reminders`}, choose your
                  plan
                </p>
                <p className="mt-1 text-sm text-muted">
                  {formatMoney(importSummary.total)} outstanding · AI follow-ups start today
                </p>
              </div>
            )}

            {activateNote && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {activateNote}
              </p>
            )}
            {emailError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailError}</p>
            )}
            {!checkoutAvailable && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Paid checkout isn&apos;t configured yet — start free to activate up to {FREE_MONTHLY_LIMIT} invoices.
              </p>
            )}

            <PricingGrid
              plans={plans}
              currentPlan="free"
              annual={annual}
              onToggleAnnual={() => setAnnual((v) => !v)}
              onSelectFree={activateFree}
              freeCta={
                invoiceCount > FREE_MONTHLY_LIMIT
                  ? `Start free — ${FREE_MONTHLY_LIMIT} of ${invoiceCount} invoices`
                  : invoiceCount > 0
                    ? `Start free — all ${invoiceCount} invoices`
                    : "Start free"
              }
              onSelectPlan={checkoutAvailable ? checkoutPaid : undefined}
              highlightPlan={showProHighlight ? "pro" : "pro_plus"}
              invoiceCount={invoiceCount}
              compact
            />

            {activating && (
              <p className="text-center text-sm text-muted animate-pulse">Activating your reminders…</p>
            )}
            {busyPlan && (
              <p className="text-center text-sm text-muted animate-pulse">Redirecting to checkout…</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex min-h-full items-center justify-center text-muted">Loading…</div>}>
      <OnboardingContent />
    </Suspense>
  );
}
