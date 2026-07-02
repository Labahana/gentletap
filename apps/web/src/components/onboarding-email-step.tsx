"use client";

import { useCallback, useEffect, useState } from "react";
import { OnboardingInfoBox } from "@/components/onboarding-shell";
import { api, type EmailSetupInfo, type EmailDnsRecord } from "@/lib/api";

type EmailChoice = "platform" | "google" | "domain";
type DomainPhase = "choose" | "input" | "dns";

type Props = {
  userEmail: string;
  onBack: () => void;
  onContinue: () => void;
  onConnectGmail: () => void;
  externalError?: string | null;
};

function PreviewBox({ from, replyTo }: { from: string; replyTo?: string }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted">
      <p>
        <span className="font-medium text-foreground">From:</span> {from}
      </p>
      {replyTo && (
        <p className="mt-1">
          <span className="font-medium text-foreground">Reply-to:</span> {replyTo}
        </p>
      )}
    </div>
  );
}

function DnsRecordsTable({ records }: { records: EmailDnsRecord[] }) {
  if (records.length === 0) {
    return <p className="text-sm text-muted">DNS records will appear here once domain registration completes.</p>;
  }
  return (
    <div className="space-y-3">
      {records.map((record) => (
        <div key={`${record.type}-${record.host}-${record.value}`} className="rounded-lg border border-border p-3 text-xs">
          <p className="font-semibold text-foreground">{record.type}</p>
          <p className="mt-2">
            <span className="text-muted">Host:</span> {record.host || "@"}
          </p>
          <p className="mt-1 break-all">
            <span className="text-muted">Value:</span> {record.value}
          </p>
          {record.priority != null && (
            <p className="mt-1">
              <span className="text-muted">Priority:</span> {record.priority}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function OptionCard({
  selected,
  onSelect,
  icon,
  title,
  badge,
  description,
  children,
  dashed,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
  children?: React.ReactNode;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
        selected
          ? "border-accent bg-accent/5"
          : dashed
            ? "border-dashed border-border hover:border-accent/40"
            : "border-border hover:border-accent/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{title}</p>
            {badge && (
              <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
                {badge}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted">{description}</p>
          {children}
        </div>
      </div>
    </button>
  );
}

export function OnboardingEmailStep({ userEmail, onBack, onContinue, onConnectGmail, externalError }: Props) {
  const [setup, setSetup] = useState<EmailSetupInfo | null>(null);
  const [choice, setChoice] = useState<EmailChoice | null>(null);
  const [domainPhase, setDomainPhase] = useState<DomainPhase>("choose");
  const [domainInput, setDomainInput] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSetup = useCallback(async () => {
    const data = await api.emailSetup();
    setSetup(data);
    if (data.provider === "platform") setChoice("platform");
    else if (data.provider === "google" || data.google_connected) setChoice("google");
    else if (data.provider === "resend" || data.domain) setChoice("domain");
    else setChoice("google");
    if (data.domain) setDomainPhase("dns");
  }, []);

  useEffect(() => {
    void loadSetup().catch(() => setError("Could not load email options"));
  }, [loadSetup]);

  async function handlePrimary() {
    if (!choice) return;
    setError(null);
    setBusy(true);
    try {
      if (choice === "platform") {
        await api.enablePlatformEmail();
        await loadSetup();
        onContinue();
        return;
      }
      if (choice === "google") {
        if (setup?.google_connected) {
          onContinue();
          return;
        }
        onConnectGmail();
        return;
      }
      if (choice === "domain") {
        if (domainPhase === "choose" || domainPhase === "input") {
          if (!domainInput.trim()) {
            setError("Enter your company email or domain");
            return;
          }
          await api.startEmailDomain(domainInput.trim());
          setDomainPhase("dns");
          await loadSetup();
          return;
        }
        await api.continueEmailDomain();
        await loadSetup();
        onContinue();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function verifyDomain() {
    setBusy(true);
    setError(null);
    try {
      await api.verifyEmailDomain();
      await loadSetup();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDomain() {
    setBusy(true);
    try {
      await api.cancelEmailDomain();
      setDomainPhase("choose");
      setDomainInput("");
      setChoice(null);
      await loadSetup();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel domain setup");
    } finally {
      setBusy(false);
    }
  }

  function selectDomain() {
    setChoice("domain");
    if (setup?.domain) setDomainPhase("dns");
    else setDomainPhase("input");
  }

  const platformFrom = setup?.platform_from ?? `Accounts <accounts@notify.gentletap.co>`;
  const domainFrom = setup?.domain_from_preview ?? `Accounts <accounts@yourcompany.com>`;
  const showDomainInput = choice === "domain" && domainPhase === "input";
  const showDomainDns = choice === "domain" && domainPhase === "dns" && setup?.domain;

  let primaryLabel = "Choose an option above";
  let primaryDisabled = !choice || busy;

  if (choice === "platform") {
    primaryLabel = busy ? "Saving…" : "Continue to go live";
    primaryDisabled = busy || !setup?.platform_available;
  } else if (choice === "google") {
    primaryLabel = setup?.google_connected ? (busy ? "Continuing…" : "Continue to go live") : "Connect Gmail";
    primaryDisabled = busy;
  } else if (choice === "domain") {
    if (domainPhase === "input") {
      primaryLabel = busy ? "Setting up…" : "Continue to DNS setup";
      primaryDisabled = busy || !domainInput.trim();
    } else if (domainPhase === "dns") {
      primaryLabel = busy ? "Continuing…" : "Continue to go live";
      primaryDisabled = busy;
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">
        Choose how your invoice reminder emails will appear to your clients.
      </p>

      {externalError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{externalError}</p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {!showDomainDns && (
        <div className="space-y-3">
          <OptionCard
            selected={choice === "google"}
            onSelect={() => {
              setChoice("google");
              setDomainPhase("choose");
            }}
            badge="Recommended"
            title="Send from Gmail"
            description="Reminders send from your Gmail inbox. Clients see your real email address."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8l8 5 8-5v10H4V8z" />
              </svg>
            }
          >
            <PreviewBox
              from={setup?.google_connected && setup.google_email ? setup.google_email : `${userEmail}`}
            />
            {setup?.google_connected && (
              <p className="mt-2 text-xs text-green">Gmail connected</p>
            )}
          </OptionCard>

          <OptionCard
            selected={choice === "platform"}
            onSelect={() => {
              setChoice("platform");
              setDomainPhase("choose");
            }}
            badge="Quick setup"
            title="Use platform email address"
            description="Ready to use immediately. No setup required."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 8l8 5 8-5v10H4V8z" />
              </svg>
            }
          >
            <PreviewBox from={platformFrom} replyTo={setup?.platform_reply_to ?? userEmail} />
          </OptionCard>

          <OptionCard
            selected={choice === "domain"}
            onSelect={selectDomain}
            dashed={choice !== "domain"}
            title="Send from your own domain"
            description="Emails appear to come from your company domain. Requires a one-time DNS setup."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
              </svg>
            }
          >
            {!showDomainInput && <PreviewBox from={domainFrom} />}
          </OptionCard>
        </div>
      )}

      {showDomainInput && (
        <div className="space-y-4 rounded-xl border-2 border-accent bg-accent/5 p-4">
          <p className="font-semibold">Send from your own domain</p>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Your company email or domain</label>
            <input
              className="input w-full"
              placeholder="you@yourcompany.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted">
              Enter your company email and we&apos;ll extract the domain, or type a domain directly.
            </p>
          </div>
          <OnboardingInfoBox>
            What you&apos;ll need: Access to your domain&apos;s DNS settings to add a few DNS records. Usually takes
            about 5 minutes.
          </OnboardingInfoBox>
        </div>
      )}

      {showDomainDns && setup.domain && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Waiting for DNS: {setup.domain.domain}</p>
            <p className="mt-1 text-xs">Add the DNS records below, then click Verify. This can take up to 48 hours.</p>
          </div>
          <div>
            <p className="mb-3 text-sm font-medium">Add these DNS records:</p>
            <DnsRecordsTable records={setup.domain.records} />
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="btn-primary py-2 text-sm" onClick={verifyDomain} disabled={busy}>
              {busy ? "Checking…" : "Verify domain"}
            </button>
            <button type="button" className="btn-secondary py-2 text-sm" onClick={cancelDomain} disabled={busy}>
              Cancel setup
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        className="flex items-center gap-1 text-sm text-muted hover:text-foreground"
        onClick={() => setShowDiff((v) => !v)}
      >
        What&apos;s the difference?
        <span className={`inline-block transition-transform ${showDiff ? "rotate-180" : ""}`}>▾</span>
      </button>
      {showDiff && (
        <div className="rounded-lg border border-border bg-background p-4 text-sm text-muted">
          <p>
            <strong className="text-foreground">Platform email</strong> sends immediately from GentleTap&apos;s shared
            address with replies to your inbox.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Gmail</strong> sends from your personal Gmail — best if clients already
            know that address.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Your domain</strong> looks most professional ({`you@yourcompany.com`}) but
            requires DNS records at your registrar.
          </p>
        </div>
      )}

      <button
        type="button"
        className="btn-primary w-full"
        disabled={primaryDisabled}
        onClick={handlePrimary}
      >
        {primaryLabel}
      </button>

      <p className="text-center text-xs text-muted">You can change this anytime in Settings</p>

      <div className="rounded-lg border border-border bg-background px-4 py-3 text-xs text-muted">
        <p className="font-medium text-foreground">Set up later in Settings:</p>
        <p className="mt-1">
          Paddle billing · Custom sender domain · Reply-to address · QuickBooks sync · WhatsApp (Pro+)
        </p>
      </div>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
