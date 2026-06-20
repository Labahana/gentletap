"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ConnectQuickBooksButton } from "@/components/connect-quickbooks-button";
import { PricingGrid } from "@/components/pricing-grid";
import { Logo } from "@/components/logo";
import { api, getToken, type ReminderPreviewItem, type ReminderPreviewSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/lib/onboarding";
import type { PlanFeature } from "@/lib/pricing";

const STEPS = [
  { id: "quickbooks", title: "Import unpaid invoices" },
  { id: "preview", title: "See what GentleTap will send" },
  { id: "email", title: "Send from your inbox" },
  { id: "pricing", title: "Turn on autopilot" },
];

const BACKEND_STEP_INDEX: Record<string, number> = {
  account: 0,
  quickbooks: 0,
  preview: 1,
  import: 1,
  email: 2,
  pricing: 3,
};

const FREE_MONTHLY_LIMIT = 5;

const EXAMPLE_PREVIEW: ReminderPreviewItem = {
  invoice_id: "example",
  doc_number: "1042",
  client_name: "Sarah Chen",
  client_email: "sarah@client.com",
  balance: 4200,
  days_overdue: 18,
  status: "yellow",
  subject: "Friendly reminder — Invoice #1042",
  body:
    "Hi Sarah,\n\nJust a quick note that invoice #1042 for $4,200.00 is still outstanding (18 days overdue). Please let me know if you have any questions or if payment is on the way.\n\nThanks!",
};

type ImportSummary = {
  count: number;
  total: number;
  message: string;
  syncing: boolean;
  oldestDays: number;
  avgDays: number;
};

function SequenceTimeline() {
  const rows = [
    { when: "Day 0", channel: "Email", detail: "Gentle reminder from your inbox" },
    { when: "+3 days", channel: "Email", detail: "Professional follow-up" },
    { when: "+3 hours later", channel: "WhatsApp", detail: "Short nudge (Pro+ plans)" },
    { when: "Up to 5 touches", channel: "Email", detail: "Escalates only when needed" },
    { when: "When paid in QuickBooks", channel: "Stops", detail: "Autopilot ends — no manual cleanup" },
  ];
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-sm font-medium">What happens over time</p>
      <ol className="mt-3 space-y-2">
        {rows.map((row) => (
          <li key={row.when} className="flex gap-3 text-sm">
            <span className="w-28 shrink-0 text-xs font-medium text-muted">{row.when}</span>
            <span className="w-16 shrink-0 text-xs font-semibold">{row.channel}</span>
            <span className={`text-muted ${row.channel === "Stops" ? "font-medium text-green" : ""}`}>
              {row.detail}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function EmailPreviewCard({
  preview,
  senderLabel,
  example,
}: {
  preview: ReminderPreviewItem;
  senderLabel: string;
  example?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4 text-sm">
      {example && (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Example preview</p>
      )}
      <div className="space-y-1 border-b border-border pb-3 text-xs text-muted">
        <p>
          <span className="font-medium text-foreground">From:</span> {senderLabel}
        </p>
        <p>
          <span className="font-medium text-foreground">To:</span>{" "}
          {preview.client_email || `${preview.client_name.toLowerCase().replace(/\s+/g, ".")}@client.com`}
        </p>
        {preview.subject && (
          <p>
            <span className="font-medium text-foreground">Subject:</span> {preview.subject}
          </p>
        )}
      </div>
      <p className="mt-1 text-xs text-muted">
        {preview.client_name} · #{preview.doc_number} · {formatMoney(preview.balance)} · {preview.days_overdue}d
        overdue
      </p>
      {preview.error ? (
        <p className="mt-2 text-red-600">{preview.error}</p>
      ) : (
        <>
          <pre className="mt-3 whitespace-pre-wrap font-sans leading-relaxed text-foreground">{preview.body}</pre>
          <p className="mt-2 text-xs text-green">Written in your voice — not a template blast</p>
        </>
      )}
    </div>
  );
}

function OnboardingContent() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const personaSaved = useRef(false);
  const [step, setStep] = useState(0);
  const [previews, setPreviews] = useState<ReminderPreviewItem[]>([]);
  const [previewSummary, setPreviewSummary] = useState<ReminderPreviewSummary | null>(null);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbError, setQbError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [emailReady, setEmailReady] = useState(false);
  const [senderEmail, setSenderEmail] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary>({
    count: 0,
    total: 0,
    message: "Connect QuickBooks to import your unpaid invoices",
    syncing: false,
    oldestDays: 0,
    avgDays: 0,
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
    if (!user || personaSaved.current) return;
    if (user.onboarding_step !== "account") return;
    const token = getToken();
    if (!token) return;
    personaSaved.current = true;
    void api.setPersona(token, "freelancer").then(() => refresh()).catch(() => {});
  }, [user, refresh]);

  useEffect(() => {
    const qb = searchParams.get("qb");
    const email = searchParams.get("email");
    const message = searchParams.get("message");
    const paid = searchParams.get("paid");
    const checkout = searchParams.get("checkout");

    if (qb === "connected") {
      setStep(1);
      setImportSummary((s) => ({ ...s, message: "Syncing invoices from QuickBooks…", syncing: true }));
      router.replace("/onboarding");
    } else if (qb === "error") {
      setStep(0);
      setQbError(message ?? "QuickBooks connection failed");
      router.replace("/onboarding");
    } else if (email === "connected") {
      const token = getToken();
      if (token) {
        api.emailStatus(token).then((s) => {
          setEmailReady(s.ready);
          if (s.provider === "google") {
            api.googleStatus(token).then((g) => setSenderEmail(g.email ?? null)).catch(() => {});
          }
        }).catch(() => setEmailReady(false));
        void refresh();
      }
      setStep(3);
      router.replace("/onboarding");
    } else if (email === "error") {
      setStep(2);
      setEmailError(message ?? "Email connection failed");
      router.replace("/onboarding");
    } else if (paid === "1") {
      router.replace("/onboarding");
    } else if (checkout === "cancelled") {
      setStep(3);
      setEmailError("Checkout cancelled — pick a plan or start free.");
      router.replace("/onboarding");
    }
  }, [searchParams, router, refresh]);

  useEffect(() => {
    if (searchParams.get("paid") !== "1" || !user) return;
    const token = getToken();
    if (!token) return;

    (async () => {
      for (let i = 0; i < 15; i += 1) {
        const me = await api.me(token);
        if (me.plan !== "free") break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      await refresh();
      setStep(3);
      try {
        const result = await api.onboardingActivate(token);
        await refresh();
        storeWelcome(result);
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
      const [sync, summary, preview] = await Promise.all([
        api.qbSyncStatus(token),
        api.invoicesSummary(token),
        api.remindersPreview(token).catch(() => null),
      ]);
      const syncing = sync.status === "syncing";
      setPreviewSummary(preview?.summary ?? null);
      if (preview?.items) setPreviews(preview.items);
      setImportSummary({
        count: preview?.summary?.overdue_count ?? summary.unpaid_count ?? sync.unpaid_count ?? 0,
        total: preview?.summary?.total_outstanding ?? summary.total_outstanding ?? sync.total_outstanding ?? 0,
        oldestDays: preview?.summary?.oldest_days_overdue ?? 0,
        avgDays: preview?.summary?.avg_days_overdue ?? 0,
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
    if (step !== 1) return;
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
    if (step !== 2) return;
    const token = getToken();
    if (!token) return;
    api.emailStatus(token).then((s) => {
      setEmailReady(s.ready);
      if (s.provider === "google") {
        api.googleStatus(token).then((g) => setSenderEmail(g.email ?? null)).catch(() => {});
      }
    }).catch(() => setEmailReady(false));
  }, [step]);

  useEffect(() => {
    if (step !== 3) return;
    const token = getToken();
    if (!token) return;
    api.billingStatus(token).then((s) => {
      setPlans(s.plans);
      setCheckoutAvailable(s.checkout_available);
    });
    pollImportStatus();
  }, [step, pollImportStatus]);

  function storeWelcome(result: {
    activated: number;
    plan_cap_total: number;
    plan_cap_remaining: number;
    skipped_escalation: unknown[];
    skipped_other: unknown[];
  }) {
    const skipped = result.skipped_escalation.length + result.skipped_other.length;
    sessionStorage.setItem(
      "onboarding_welcome",
      JSON.stringify({
        activated: result.activated,
        skipped,
        planCapTotal: result.plan_cap_total,
        planCapRemaining: result.plan_cap_remaining,
      }),
    );
    const parts: string[] = [];
    if (result.plan_cap_total && result.plan_cap_remaining === 0) {
      parts.push(`Starter plan: ${result.plan_cap_total} collections/month used. Upgrade anytime for the rest.`);
    }
    if (skipped > 0) parts.push(`${skipped} invoice(s) skipped — see dashboard for details.`);
    const note = parts.length > 0 ? parts.join(" ") : null;
    if (note) sessionStorage.setItem("onboarding_note", note);
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
      const { authorization_url } = await api.googleConnectUrl(token, "onboarding");
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
          setSenderEmail(resendEmail);
          await refresh();
          await api.advanceOnboardingPricing(token);
          await refresh();
          setStep(3);
          return;
        }
      }
      setEmailError("Verification pending — check your inbox, then reload this page.");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function goToEmail() {
    const token = getToken();
    if (token) {
      await api.advanceOnboardingEmail(token);
      await refresh();
    }
    setStep(2);
  }

  async function continueToGoLive() {
    if (!emailReady) return;
    const token = getToken();
    if (token) {
      await api.advanceOnboardingPricing(token);
      await refresh();
    }
    setStep(3);
  }

  async function activateFree() {
    const token = getToken();
    if (!token) return;
    setActivating(true);
    setEmailError(null);
    try {
      const result = await api.onboardingActivate(token);
      await refresh();
      storeWelcome(result);
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
      const { checkout_url } = await api.billingCheckout(token, plan, annual ? "year" : "month", "onboarding");
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
  const senderLabel = senderEmail ?? "you@yourdomain.com";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <Logo height={28} />
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

        {step === 0 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Connect QuickBooks first — we&apos;ll show exactly what GentleTap will send before anything goes live.
            </p>
            {qbError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{qbError}</p>
            )}
            <div className="flex justify-center">
              <ConnectQuickBooksButton onClick={connectQuickBooks} busy={qbConnecting} />
            </div>
            <p className="text-center text-xs text-muted">
              Read-only access · nothing is changed in QuickBooks Online
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-6">
            {importSummary.syncing ? (
              <div className="rounded-xl bg-background p-10 text-center">
                <p className="text-sm text-muted animate-pulse">Syncing from QuickBooks…</p>
              </div>
            ) : invoiceCount > 0 ? (
              <>
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-8 text-center">
                  <p className="text-sm font-medium uppercase tracking-wide text-accent">We found</p>
                  <p className="mt-2 text-5xl font-bold text-foreground">{invoiceCount}</p>
                  <p className="text-lg text-muted">
                    unpaid invoice{invoiceCount === 1 ? "" : "s"}
                  </p>
                  <p className="mt-4 text-3xl font-semibold">{formatMoney(importSummary.total)}</p>
                  <p className="text-sm text-muted">total outstanding</p>
                  {(importSummary.oldestDays > 0 || importSummary.avgDays > 0) && (
                    <p className="mt-3 text-sm text-muted">
                      Oldest: {importSummary.oldestDays} days · Average: {importSummary.avgDays} days overdue
                    </p>
                  )}
                </div>

                {previews.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      Here&apos;s what GentleTap will send — AI-drafted, in your voice:
                    </p>
                    {previews.slice(0, 3).map((p) => (
                      <EmailPreviewCard key={p.invoice_id} preview={p} senderLabel={senderLabel} />
                    ))}
                    {invoiceCount > 3 && (
                      <p className="text-center text-sm text-muted">
                        + {invoiceCount - 3} more invoice{invoiceCount - 3 === 1 ? "" : "s"} ready to go
                      </p>
                    )}
                  </div>
                )}

                <SequenceTimeline />

                <p className="text-center text-sm text-muted">
                  First reminders can go out within a few hours after you connect email and turn on autopilot.
                </p>

                <button className="btn-primary w-full" onClick={goToEmail}>
                  Connect email to continue
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  No overdue invoices in QuickBooks yet. When they appear, GentleTap syncs every 30 minutes and drafts
                  reminders automatically.
                </p>
                <EmailPreviewCard preview={EXAMPLE_PREVIEW} senderLabel={senderLabel} example />
                <SequenceTimeline />
                <button className="btn-primary w-full" onClick={goToEmail}>
                  Connect email &amp; finish setup
                </button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Reminders send from <strong>your</strong> inbox — clients see your name, not a robot. Connect once to go
              live.
            </p>
            {emailError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailError}</p>
            )}
            {emailReady && (
              <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                Email connected — ready to turn on autopilot.
              </p>
            )}
            <button className="card w-full text-left hover:border-accent" onClick={connectGmail}>
              <p className="font-semibold">Connect Gmail</p>
              <p className="mt-1 text-sm text-muted">Grant send access — separate from sign-in.</p>
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
            <button className="btn-primary w-full" onClick={continueToGoLive} disabled={!emailReady}>
              Continue to turn on autopilot
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-6">
            {invoiceCount > 0 && (
              <div className="rounded-xl bg-background p-6 text-center">
                <p className="text-lg font-semibold">
                  Turn on autopilot for {formatMoney(importSummary.total)} outstanding
                </p>
                <p className="mt-1 text-sm text-muted">
                  {invoiceCount} invoice{invoiceCount === 1 ? "" : "s"} · sequences stop automatically when QuickBooks
                  shows paid
                </p>
              </div>
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
                  ? `Start free — ${FREE_MONTHLY_LIMIT} of ${invoiceCount} invoices this month`
                  : invoiceCount > 0
                    ? `Turn on autopilot — all ${invoiceCount} invoices`
                    : "Turn on autopilot"
              }
              onSelectPlan={checkoutAvailable ? checkoutPaid : undefined}
              highlightPlan={showProHighlight ? "pro" : "pro_plus"}
              invoiceCount={invoiceCount}
              compact
            />

            {activating && (
              <p className="text-center text-sm text-muted animate-pulse">Turning on autopilot…</p>
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
