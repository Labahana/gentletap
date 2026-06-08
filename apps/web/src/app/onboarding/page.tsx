"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
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
  const [preview, setPreview] = useState<{ subject: string; body: string } | null>(null);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbError, setQbError] = useState<string | null>(null);
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
    const message = searchParams.get("message");
    if (qb === "connected") {
      setStep(2);
      setImportSummary((s) => ({
        ...s,
        message: "Syncing invoices from QuickBooks…",
        syncing: true,
      }));
      router.replace("/onboarding");
    } else if (qb === "error") {
      setStep(1);
      setQbError(message ?? "QuickBooks connection failed");
      router.replace("/onboarding");
    }
  }, [searchParams, router]);

  const pollImportStatus = useCallback(async () => {
    const token = getToken();
    if (!token) return;

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

      if (sync.status === "complete" || sync.status === "error") {
        return false;
      }
      return syncing || sync.status === "idle";
    } catch {
      setImportSummary((s) => ({
        ...s,
        message: "Could not load sync status",
        syncing: false,
      }));
      return false;
    }
  }, []);

  useEffect(() => {
    if (step !== 2) return;

    let active = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function start() {
      const keepPolling = await pollImportStatus();
      if (!active) return;
      if (keepPolling) {
        interval = setInterval(async () => {
          const again = await pollImportStatus();
          if (!again && interval) clearInterval(interval);
        }, 2000);
      }
    }

    start();
    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [step, pollImportStatus]);

  useEffect(() => {
    if (step === 4) {
      api.previewIntelligence().then((r) => {
        if (r.message) setPreview(r.message);
      });
    }
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

  function finish() {
    router.push("/dashboard");
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
                <input
                  type="radio"
                  name="persona"
                  checked={persona === p}
                  onChange={() => setPersona(p)}
                />
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
              Read-only access to unpaid invoices in your QuickBooks sandbox company. You&apos;ll
              authorize on Intuit, then we import overdue balances automatically.
            </p>
            {qbError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {qbError}
              </p>
            )}
            <button
              className="btn-primary w-full"
              onClick={connectQuickBooks}
              disabled={qbConnecting}
            >
              {qbConnecting ? "Redirecting to QuickBooks…" : "Connect QuickBooks"}
            </button>
            <button className="btn-secondary w-full text-sm" onClick={() => setStep(2)}>
              Skip for now
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
                  <p className="text-4xl font-bold text-accent">
                    {importSummary.count || "—"}
                  </p>
                  <p className="text-sm text-muted">unpaid invoices</p>
                  <p className="mt-4 text-2xl font-semibold">
                    {importSummary.total
                      ? `$${importSummary.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </p>
                  <p className="text-sm text-muted">total outstanding</p>
                </>
              )}
            </div>
            <p className="text-sm text-muted">{importSummary.message}</p>
            <button
              className="btn-primary w-full"
              onClick={() => setStep(3)}
              disabled={importSummary.syncing}
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button className="card text-left hover:border-accent" onClick={() => setStep(4)}>
              <p className="font-semibold">Connect Gmail</p>
              <p className="mt-1 text-sm text-muted">One click · sends from your inbox</p>
            </button>
            <button className="card text-left hover:border-accent" onClick={() => setStep(4)}>
              <p className="font-semibold">Use another email</p>
              <p className="mt-1 text-sm text-muted">Verify via inbox link</p>
            </button>
          </div>
        )}

        {step === 4 && preview && (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-muted">
              This is what Sarah would receive for invoice #1234 ($4,200).
            </p>
            <div className="rounded-xl bg-background p-4 text-sm">
              <p className="font-medium">{preview.subject}</p>
              <pre className="mt-3 whitespace-pre-wrap font-sans leading-relaxed">
                {preview.body.split("---")[0].trim()}
              </pre>
            </div>
            <button className="btn-primary w-full" onClick={finish}>
              Approve & go live
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
