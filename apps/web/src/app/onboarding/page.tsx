"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { OnboardingEmailStep } from "@/components/onboarding-email-step";
import { OnboardingImportStep } from "@/components/onboarding-import-step";
import { OnboardingPreviewStep } from "@/components/onboarding-preview-step";
import { OnboardingInfoBox, OnboardingLoadingOverlay, OnboardingShell } from "@/components/onboarding-shell";
import { api, getToken, type ReminderPreviewItem } from "@/lib/api";
import { openOverlayCheckout, type PaddlePublicConfig } from "@/lib/paddle";
import { useAuth } from "@/lib/auth-context";

const STEPS = [
  { id: "profile", label: "Your Profile", subtitle: "Name, company & logo" },
  { id: "import", label: "Import Invoices", subtitle: "QuickBooks or spreadsheet" },
  { id: "email", label: "Email Setup", subtitle: "Send from your inbox" },
  { id: "invoice", label: "Go Live", subtitle: "Turn on autopilot" },
];

function backendToView(onboardingStep: string): { macro: number } {
  switch (onboardingStep) {
    case "account":
    case "persona":
      return { macro: 0 };
    case "invoice_import":
    case "quickbooks":
      return { macro: 1 };
    case "email":
      return { macro: 2 };
    case "preview":
    case "import":
    case "pricing":
      return { macro: 3 };
    default:
      return { macro: 0 };
  }
}

function furthestMacroStep(onboardingStep: string): number {
  return backendToView(onboardingStep).macro;
}

function stepHeading(macro: number): { title: string; description: string } {
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
      description: "Choose how your invoice reminder emails will appear to your clients.",
    };
  }
  if (macro === 3) {
    return {
      title: "Go Live",
      description: "",
    };
  }
  return { title: "Go Live", description: "" };
}

const FREE_MONTHLY_LIMIT = 5;

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

function OnboardingContent() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepSynced = useRef(false);
  const [macroStep, setMacroStep] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [emailDisplayName, setEmailDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<ReminderPreviewItem[]>([]);
  const [qbConnecting, setQbConnecting] = useState(false);
  const [qbError, setQbError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [senderEmail, setSenderEmail] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [checkoutAvailable, setCheckoutAvailable] = useState(false);
  const [paddleConfig, setPaddleConfig] = useState<PaddlePublicConfig | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary>({
    count: 0,
    total: 0,
    message: "Connect QuickBooks or upload a spreadsheet to import invoices",
    syncing: false,
    oldestDays: 0,
    avgDays: 0,
  });

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
          setMacroStep(backendToView(me.onboarding_step).macro);
        }).catch(() => setMacroStep(3));
        void refresh();
      } else {
        setMacroStep(3);
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
      setEmailError("Checkout cancelled — you can turn on autopilot free or upgrade anytime.");
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
      const [sync, summary] = await Promise.all([
        api.qbSyncStatus(token),
        api.invoicesSummary(token),
      ]);
      const syncing = sync.status === "syncing";
      setImportSummary({
        count: summary.overdue_count ?? summary.unpaid_count ?? sync.unpaid_count ?? 0,
        total: summary.total_outstanding ?? sync.total_outstanding ?? 0,
        oldestDays: summary.oldest_days_overdue ?? 0,
        avgDays: summary.avg_days_overdue ?? 0,
        message: sync.message,
        syncing,
      });
      return syncing;
    } catch {
      setImportSummary((s) => ({ ...s, message: "Could not load sync status", syncing: false }));
      return false;
    }
  }, []);

  const loadPreviewDrafts = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setPreviewsLoading(true);
    try {
      const preview = await api.remindersPreview(token);
      if (preview.items) setPreviews(preview.items);
      setImportSummary((s) => ({
        ...s,
        count: preview.summary.overdue_count ?? s.count,
        total: preview.summary.total_outstanding ?? s.total,
        oldestDays: preview.summary.oldest_days_overdue ?? s.oldestDays,
        avgDays: preview.summary.avg_days_overdue ?? s.avgDays,
      }));
    } catch {
      setPreviews([]);
    } finally {
      setPreviewsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (macroStep !== 1) return;
    void pollImportStatus();
  }, [macroStep, pollImportStatus]);

  useEffect(() => {
    if (macroStep !== 1 || !importSummary.syncing) return;
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
  }, [macroStep, importSummary.syncing, pollImportStatus]);

  useEffect(() => {
    if (macroStep !== 2 && macroStep !== 3) return;
    const token = getToken();
    if (!token) return;
    api.emailSetup(token).then((setup) => {
      if (setup.google_connected && setup.google_email) {
        setSenderEmail(setup.google_email);
      } else if (setup.platform_from) {
        setSenderEmail(setup.platform_from);
      }
    }).catch(() => {});
    api.googleStatus(token).then((g) => {
      if (g.connected && g.email) setSenderEmail(g.email);
    }).catch(() => {});
  }, [macroStep]);

  useEffect(() => {
    if (macroStep !== 3) return;
    void loadPreviewDrafts();
    const token = getToken();
    if (!token) return;
    api.billingStatus(token).then((s) => {
      setCheckoutAvailable(s.checkout_available);
      setPaddleConfig(s.paddle);
    }).catch(() => {});
  }, [macroStep, loadPreviewDrafts]);

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
  }

  async function goLive() {
    const token = getToken();
    if (!token) return;
    setActivating(true);
    setEmailError(null);
    try {
      await api.advanceOnboardingPricing(token);
      const result = await api.onboardingActivate(token);
      await refresh();
      storeWelcome(result);
      router.push("/dashboard");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Could not activate reminders");
      setActivating(false);
    }
  }

  async function upgradeFromOnboarding() {
    const token = getToken();
    if (!token) return;
    setEmailError(null);
    setBusyPlan("pro");
    try {
      const { checkout_url, transaction_id } = await api.billingCheckout(
        token,
        "pro",
        "month",
        "onboarding",
      );
      const opened =
        paddleConfig != null &&
        (await openOverlayCheckout({
          config: paddleConfig,
          transactionId: transaction_id,
          successUrl: `${window.location.origin}/onboarding?paid=1`,
          onComplete: () => {
            void refresh();
            router.replace("/onboarding?paid=1");
          },
        }));
      if (!opened) {
        if (!checkout_url) throw new Error("Checkout is not available — please try again later");
        window.location.href = checkout_url;
        return;
      }
      setBusyPlan(null);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Checkout failed");
      setBusyPlan(null);
    }
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

  if (loading || !user) {
    return <OnboardingLoadingOverlay />;
  }

  const onboardingStep = user.onboarding_step;
  const furthestStep = furthestMacroStep(onboardingStep);

  function goToStep(index: number) {
    if (index > furthestStep) return;
    setMacroStep(index);
  }

  function goBack() {
    if (macroStep === 3) {
      setMacroStep(2);
      return;
    }
    setMacroStep((current) => Math.max(0, current - 1));
  }

  const invoiceCount = importSummary.count;
  const senderLabel = (() => {
    if (senderEmail && senderEmail.includes("<")) return senderEmail;
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
  const businessName =
    (companyName || user.company_name || emailDisplayName || user.email_display_name || user.full_name || user.email.split("@")[0] || "").trim();

  const content = stepHeading(macroStep);

  return (
    <OnboardingShell
      steps={STEPS}
      currentStep={macroStep}
      maxUnlockedStep={furthestStep}
      onStepSelect={goToStep}
      title={content.title}
      description={content.description}
      wide={macroStep === 3}
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
            oldestDays={importSummary.oldestDays}
            avgDays={importSummary.avgDays}
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

        {macroStep === 3 && (
          <OnboardingPreviewStep
              invoiceCount={invoiceCount}
              totalOutstanding={importSummary.total}
              avgDays={importSummary.avgDays}
              previews={previews}
              senderLabel={senderLabel}
              businessName={businessName}
              contactEmail={user.email}
              contactPhone={phone || user.phone}
              loading={previewsLoading}
              activating={activating}
              busyPlan={busyPlan}
              error={emailError}
              freeMonthlyLimit={FREE_MONTHLY_LIMIT}
              onBack={goBack}
              onGoLive={goLive}
              onUpgrade={checkoutAvailable ? upgradeFromOnboarding : undefined}
          />
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
