"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { OnboardingEmailStep } from "@/components/onboarding-email-step";
import { OnboardingImportStep } from "@/components/onboarding-import-step";
import { OnboardingInfoBox, OnboardingLoadingOverlay, OnboardingShell } from "@/components/onboarding-shell";
import { PricingGrid } from "@/components/pricing-grid";
import { api, getToken, type ReminderPreviewItem, type ReminderPreviewSummary } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { formatMoney } from "@/lib/onboarding";
import type { PlanFeature } from "@/lib/pricing";

const STEPS = [
  { id: "profile", label: "Your Profile", subtitle: "Name, company & logo" },
  { id: "import", label: "Import Invoices", subtitle: "QuickBooks or spreadsheet" },
  { id: "email", label: "Email Setup", subtitle: "Send from your inbox" },
  { id: "invoice", label: "First Invoice", subtitle: "Preview & go live" },
];

type InvoicePhase = "preview" | "pricing";

function backendToView(onboardingStep: string): { macro: number; invoicePhase: InvoicePhase } {
  switch (onboardingStep) {
    case "account":
    case "persona":
      return { macro: 0, invoicePhase: "preview" };
    case "invoice_import":
    case "quickbooks":
      return { macro: 1, invoicePhase: "preview" };
    case "email":
      return { macro: 2, invoicePhase: "preview" };
    case "preview":
    case "import":
      return { macro: 3, invoicePhase: "preview" };
    case "pricing":
      return { macro: 3, invoicePhase: "pricing" };
    default:
      return { macro: 0, invoicePhase: "preview" };
  }
}

function furthestMacroStep(onboardingStep: string): number {
  return backendToView(onboardingStep).macro;
}

function stepHeading(macro: number, invoicePhase: InvoicePhase): { title: string; description: string } {
  if (macro === 0) return { title: "Your Profile", description: "Name, company & logo" };
  if (macro === 1) {
    return {
      title: "Import Invoices",
      description: "Connect QuickBooks or upload a spreadsheet of unpaid invoices.",
    };
  }
  if (macro === 2) {
    return {
      title: "Email Setup",
      description: "Configure sending",
    };
  }
  if (invoicePhase === "preview") {
    return {
      title: "First Invoice",
      description: "See what GentleTap will send before anything goes live.",
    };
  }
  return {
    title: "First Invoice",
    description: "Pick a plan and turn on autopilot — sequences stop when invoices are marked paid.",
  };
}

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

function OnboardingField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-red"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function OnboardingNavFooter({
  onBack,
  backDisabled,
  children,
}: {
  onBack?: () => void;
  backDisabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
      {onBack !== undefined || backDisabled ? (
        <button
          type="button"
          className="btn-secondary w-full sm:w-auto disabled:opacity-50"
          onClick={onBack}
          disabled={backDisabled || !onBack}
        >
          Back
        </button>
      ) : (
        <span className="hidden sm:block" />
      )}
      {children ? <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">{children}</div> : null}
    </div>
  );
}

function SequenceTimeline() {
  const rows = [
    { when: "Day 0", channel: "Email", detail: "Gentle reminder from your inbox" },
    { when: "+3 days", channel: "Email", detail: "Professional follow-up" },
    { when: "+3 hours later", channel: "WhatsApp", detail: "Short nudge (Pro+ plans)" },
    { when: "Up to 5 touches", channel: "Email", detail: "Escalates only when needed" },
    { when: "When marked paid", channel: "Stops", detail: "Autopilot ends — no manual cleanup" },
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
  const stepSynced = useRef(false);
  const [macroStep, setMacroStep] = useState(0);
  const [invoicePhase, setInvoicePhase] = useState<InvoicePhase>("preview");
  const [companyName, setCompanyName] = useState("");
  const [emailDisplayName, setEmailDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<ReminderPreviewItem[]>([]);
  const [previewSummary, setPreviewSummary] = useState<ReminderPreviewSummary | null>(null);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbError, setQbError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [senderEmail, setSenderEmail] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary>({
    count: 0,
    total: 0,
    message: "Connect QuickBooks or upload a spreadsheet to import invoices",
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
    if (stepSynced.current) return;
    const view = backendToView(user.onboarding_step);
    setMacroStep(view.macro);
    setInvoicePhase(view.invoicePhase);
    stepSynced.current = true;
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    setCompanyName(user.company_name ?? "");
    setEmailDisplayName(user.email_display_name ?? user.full_name ?? "");
    setPhone(user.phone ?? "");
    setWebsite(user.website ?? "");
    setLogoPreview(user.logo_url ?? null);
  }, [user]);

  useEffect(() => {
    const qb = searchParams.get("qb");
    const email = searchParams.get("email");
    const message = searchParams.get("message");
    const paid = searchParams.get("paid");
    const checkout = searchParams.get("checkout");

    if (qb === "connected") {
      setMacroStep(1);
      setImportSummary((s) => ({ ...s, message: "Syncing invoices from QuickBooks…", syncing: true }));
      router.replace("/onboarding");
    } else if (qb === "error") {
      setMacroStep(1);
      setQbError(message ?? "QuickBooks connection failed");
      router.replace("/onboarding");
    } else if (email === "connected") {
      const token = getToken();
      if (token) {
        api.googleStatus(token).then((g) => setSenderEmail(g.email ?? null)).catch(() => {});
        api.me(token).then((me) => {
          const view = backendToView(me.onboarding_step);
          setMacroStep(view.macro);
          setInvoicePhase(view.invoicePhase);
        }).catch(() => setMacroStep(3));
        void refresh();
      } else {
        setMacroStep(3);
        setInvoicePhase("preview");
      }
      router.replace("/onboarding");
    } else if (email === "error") {
      setMacroStep(2);
      setEmailError(message ?? "Email connection failed");
      router.replace("/onboarding");
    } else if (paid === "1") {
      router.replace("/onboarding");
    } else if (checkout === "cancelled") {
      setMacroStep(3);
      setInvoicePhase("pricing");
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
      setMacroStep(3);
      setInvoicePhase("pricing");
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
    if (macroStep !== 1) return;
    void pollImportStatus();
  }, [macroStep, pollImportStatus]);

  useEffect(() => {
    const shouldPoll =
      (macroStep === 1 && importSummary.syncing) || (macroStep === 3 && invoicePhase === "preview");
    if (!shouldPoll) return;
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
  }, [macroStep, invoicePhase, importSummary.syncing, pollImportStatus]);

  useEffect(() => {
    if (macroStep !== 2) return;
    const token = getToken();
    if (!token) return;
    api.googleStatus(token).then((g) => {
      if (g.connected && g.email) setSenderEmail(g.email);
    }).catch(() => {});
  }, [macroStep]);

  useEffect(() => {
    if (macroStep !== 3 || invoicePhase !== "pricing") return;
    const token = getToken();
    if (!token) return;
    api.billingStatus(token).then((s) => {
      setPlans(s.plans);
      setCheckoutAvailable(s.checkout_available);
    });
    pollImportStatus();
  }, [macroStep, invoicePhase, pollImportStatus]);

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

  async function continueToEmail() {
    const token = getToken();
    if (token) {
      await api.advanceOnboardingImport(token);
      await refresh();
    }
    setMacroStep(2);
  }

  async function continueToPreview() {
    const token = getToken();
    if (token) {
      await api.advanceOnboardingQuickbooks(token);
      await refresh();
    }
    setMacroStep(3);
    setInvoicePhase("preview");
  }

  async function continueToPricing() {
    const token = getToken();
    if (token) {
      await api.advanceOnboardingPricing(token);
      await refresh();
    }
    setMacroStep(3);
    setInvoicePhase("pricing");
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    if (!companyName.trim()) {
      setProfileError("Company name is required");
      return;
    }
    setProfileSaving(true);
    setProfileError(null);
    try {
      await api.saveOnboardingProfile(token, {
        company_name: companyName.trim(),
        email_display_name: emailDisplayName.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        logo_url: logoPreview,
      });
      await refresh();
      setMacroStep(1);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg)$/i.test(file.type)) {
      setProfileError("Logo must be PNG or JPG");
      return;
    }
    if (file.size > 500_000) {
      setProfileError("Logo file is too large — max 500 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        if (img.width > 600 || img.height > 600) {
          setProfileError("Logo must be at most 600×600 px");
          return;
        }
        setProfileError(null);
        setLogoPreview(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
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
    return <OnboardingLoadingOverlay />;
  }

  const onboardingStep = user.onboarding_step;
  const furthestStep = furthestMacroStep(onboardingStep);

  function goToStep(index: number) {
    if (index > furthestStep) return;
    setMacroStep(index);
    if (index === 3) {
      setInvoicePhase(backendToView(onboardingStep).invoicePhase);
    }
  }

  function goBack() {
    if (macroStep === 3) {
      if (invoicePhase === "pricing") setInvoicePhase("preview");
      else setMacroStep(2);
      return;
    }
    setMacroStep((current) => Math.max(0, current - 1));
  }

  const invoiceCount = importSummary.count;
  const showProHighlight = invoiceCount > FREE_MONTHLY_LIMIT;
  const senderLabel = (() => {
    const name = emailDisplayName || user.full_name || user.email.split("@")[0];
    const company = companyName || user.company_name;
    const from = senderEmail ?? user.email;
    if (company) {
      const role = emailDisplayName || user.email_display_name;
      const title = role ? `${role} · ${company}` : company;
      return `${title} <${from}>`;
    }
    return `${name} <${from}>`;
  })();

  const content = stepHeading(macroStep, invoicePhase);

  return (
    <OnboardingShell
      steps={STEPS}
      currentStep={macroStep}
      maxUnlockedStep={furthestStep}
      onStepSelect={goToStep}
      title={content.title}
      description={content.description}
      wide={macroStep === 3 && invoicePhase === "pricing"}
    >
        {macroStep === 0 && (
          <form className="space-y-5" onSubmit={saveProfile}>
            <p className="text-sm leading-relaxed text-muted">
              These details appear in the email signature on every reminder you send. Enter how you want to appear to
              your clients — not necessarily your internal role.
            </p>
            <OnboardingInfoBox>
              If you have multiple sender addresses (e.g. accounts@ and legal@), you can set a different signature for
              each one later in Settings.
            </OnboardingInfoBox>
            {profileError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{profileError}</p>
            )}
            <OnboardingField label="Company Name" required hint={'Used in the "From" display and your email signature.'}>
              <input
                className="input w-full"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Acme Ltd"
                required
              />
            </OnboardingField>
            <OnboardingField
              label="Your Name as it appears in emails (optional)"
              hint={'This shows as your title/role in the signature e.g. "Owner · Acme Ltd" or "Lucy – Accounts Receivable".'}
            >
              <input
                className="input w-full"
                value={emailDisplayName}
                onChange={(e) => setEmailDisplayName(e.target.value)}
                placeholder="e.g. Accounts Receivable, Lucy from Finance"
              />
            </OnboardingField>
            <div className="grid gap-5 sm:grid-cols-2">
              <OnboardingField label="Phone (optional)">
                <input
                  className="input w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555 0100"
                />
              </OnboardingField>
              <OnboardingField label="Website (optional)">
                <input
                  className="input w-full"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. yourcompany.com"
                />
              </OnboardingField>
            </div>
            <OnboardingField
              label="Company Logo (optional)"
              hint="Shown in your email signature and on hosted invoice pages. PNG or JPG, max 600×600 px."
            >
              <div className="flex flex-wrap items-center gap-4">
                {logoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Company logo preview" className="h-16 w-16 rounded-lg border border-border object-contain" />
                )}
                <label className="btn-secondary cursor-pointer py-2 text-sm">
                  Upload Logo
                  <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={handleLogoUpload} />
                </label>
                {logoPreview && (
                  <button type="button" className="text-sm text-muted hover:text-foreground" onClick={() => setLogoPreview(null)}>
                    Remove
                  </button>
                )}
              </div>
            </OnboardingField>
            <OnboardingNavFooter backDisabled>
              <button type="submit" className="btn-primary w-full sm:w-auto" disabled={profileSaving}>
                {profileSaving ? "Saving…" : furthestStep > 0 ? "Save changes" : "Save & Continue"}
              </button>
            </OnboardingNavFooter>
          </form>
        )}

        {macroStep === 1 && (
          <OnboardingImportStep
            onBack={goBack}
            onContinue={continueToEmail}
            onConnectQuickBooks={connectQuickBooks}
            qbConnecting={qbConnecting}
            qbError={qbError}
            importMessage={importSummary.message}
            importSyncing={importSummary.syncing}
            invoiceCount={importSummary.count}
            totalOutstanding={importSummary.total}
            onInvoicesChanged={() => void pollImportStatus()}
          />
        )}

        {macroStep === 2 && (
          <OnboardingEmailStep
            userEmail={user.email}
            onBack={goBack}
            onContinue={continueToPreview}
            onConnectGmail={connectGmail}
            externalError={emailError}
          />
        )}

        {macroStep === 3 && invoicePhase === "preview" && (
          <div className="space-y-6">
            {importSummary.syncing ? (
              <div className="rounded-xl bg-background p-10 text-center">
                <p className="text-sm text-muted animate-pulse">Loading your invoices…</p>
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

                <OnboardingNavFooter onBack={goBack}>
                  <button type="button" className="btn-primary w-full sm:w-auto" onClick={continueToPricing}>
                    Continue
                  </button>
                </OnboardingNavFooter>
              </>
            ) : (
              <>
                <p className="text-sm text-muted">
                  No overdue invoices yet. When you add more, GentleTap syncs and drafts reminders automatically.
                </p>
                <EmailPreviewCard preview={EXAMPLE_PREVIEW} senderLabel={senderLabel} example />
                <SequenceTimeline />
                <OnboardingNavFooter onBack={goBack}>
                  <button type="button" className="btn-primary w-full sm:w-auto" onClick={continueToPricing}>
                    Continue
                  </button>
                </OnboardingNavFooter>
              </>
            )}
          </div>
        )}

        {macroStep === 3 && invoicePhase === "pricing" && (
          <div className="space-y-6">
            {invoiceCount > 0 && (
              <div className="rounded-xl border border-border bg-background p-6 text-center">
                <p className="text-lg font-semibold">
                  Turn on autopilot for {formatMoney(importSummary.total)} outstanding
                </p>
                <p className="mt-1 text-sm text-muted">
                  {invoiceCount} invoice{invoiceCount === 1 ? "" : "s"} · sequences stop automatically when invoices are
                  marked paid
                </p>
              </div>
            )}

            {emailError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{emailError}</p>
            )}
            {!checkoutAvailable && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Paid checkout isn&apos;t configured yet — start free to activate up to {FREE_MONTHLY_LIMIT} invoices.
              </p>
            )}

            <div className="text-center">
              <h3 className="text-2xl font-bold">Simple, transparent pricing</h3>
              <p className="mt-2 text-muted">
                Start free. One recovered invoice pays for months of GentleTap.
              </p>
            </div>

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
            />

            {activating && (
              <p className="text-center text-sm text-muted animate-pulse">Turning on autopilot…</p>
            )}
            {busyPlan && (
              <p className="text-center text-sm text-muted animate-pulse">Redirecting to checkout…</p>
            )}

            <OnboardingNavFooter onBack={goBack} />
          </div>
        )}
    </OnboardingShell>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoadingOverlay />}>
      <OnboardingContent />
    </Suspense>
  );
}
