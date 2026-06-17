"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, getToken, type ReminderPreviewItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const STEPS = [
  { id: "persona", title: "Tell us about you" },
  { id: "quickbooks", title: "Connect QuickBooks" },
  { id: "import", title: "Import invoices" },
  { id: "email", title: "Connect email" },
  { id: "preview", title: "Preview reminders" },
];

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
  const [approving, setApproving] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary>({
    count: 0,
    total: 0,
    message: "Connect QuickBooks to import your unpaid invoices",
    syncing: false,
  });

  useEffect(() => {
    if (!loading && !user) router.replace("/signup");
  }, [loading, user, router]);

  useEffect(() => {
    const qb = searchParams.get("qb");
    const email = searchParams.get("email");
    const message = searchParams.get("message");
    if (qb === "connected") {
      setStep(2);
      setImportSummary((s) => ({ ...s, message: "Syncing invoices from QuickBooks…", syncing: true }));
      router.replace("/onboarding");
    } else if (qb === "error") {
      setStep(1);
      setQbError(message ?? "QuickBooks connection failed");
      router.replace("/onboarding");
    } else if (email === "connected") {
      setStep(4);
      router.replace("/onboarding");
    } else if (email === "error") {
      setStep(3);
      setEmailError(message ?? "Email connection failed");
      router.replace("/onboarding");
    }
  }, [searchParams, router]);

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
    if (step !== 2) return;
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
    if (step !== 4) return;
    const token = getToken();
    if (!token) return;
    api.remindersPreview(token).then((r) => setPreviews(r.items)).catch(() => setPreviews([]));
  }, [step]);

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
      setStep(4);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Verification failed");
    }
  }

  async function finish() {
    const token = getToken();
    if (!token) return;
    setApproving(true);
    try {
      await api.approveAll(token);
      await refresh();
      router.push("/dashboard");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Could not activate reminders");
      setApproving(false);
    }
  }

  if (loading || !user) {
    return <div className="flex min-h-full items-center justify-center text-muted">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
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
            <button onClick={savePersona} className="btn-primary mt-4">
              Continue
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Read-only access to unpaid invoices. Authorize on Intuit, then we import balances automatically.
            </p>
            {qbError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{qbError}</p>
            )}
            <button className="btn-primary w-full" onClick={connectQuickBooks} disabled={qbConnecting}>
              {qbConnecting ? "Redirecting to QuickBooks…" : "Connect QuickBooks"}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="mt-6 space-y-4 text-center">
            <div className="rounded-xl bg-background p-8">
              {importSummary.syncing ? (
                <p className="text-sm text-muted animate-pulse">Syncing from QuickBooks…</p>
              ) : (
                <>
                  <p className="text-4xl font-bold text-accent">{importSummary.count}</p>
                  <p className="text-sm text-muted">unpaid invoices</p>
                  <p className="mt-4 text-2xl font-semibold">
                    ${importSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted">total outstanding</p>
                </>
              )}
            </div>
            <p className="text-sm text-muted">{importSummary.message}</p>
            <button className="btn-primary w-full" onClick={() => setStep(3)} disabled={importSummary.syncing}>
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 space-y-4">
            {emailError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailError}</p>
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
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              Review AI-drafted reminders for your overdue invoices. GentleTap sends these on your behalf after you
              approve.
            </p>
            {previews.length === 0 ? (
              <p className="text-sm text-muted">No overdue invoices to preview yet.</p>
            ) : (
              previews.slice(0, 3).map((p) => (
                <div key={p.invoice_id} className="rounded-xl bg-background p-4 text-sm">
                  <p className="text-xs text-muted">
                    {p.client_name} · #{p.doc_number} · ${p.balance.toLocaleString()} · {p.days_overdue}d overdue
                  </p>
                  {p.error ? (
                    <p className="mt-2 text-red-600">{p.error}</p>
                  ) : (
                    <>
                      <p className="mt-2 text-xs uppercase tracking-wide text-muted">
                        {p.channel === "whatsapp" ? "WhatsApp template preview" : "Email preview"}
                      </p>
                      {p.subject && <p className="mt-1 font-medium">{p.subject}</p>}
                      <pre className="mt-2 whitespace-pre-wrap font-sans leading-relaxed">{p.body}</pre>
                      {p.channel === "whatsapp" && (
                        <p className="mt-2 text-xs text-muted">
                          Sent via Meta-approved WhatsApp template — wording is fixed per policy.
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
            {emailError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailError}</p>
            )}
            <button className="btn-primary w-full" onClick={finish} disabled={approving}>
              {approving ? "Activating…" : "Approve & go live"}
            </button>
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
