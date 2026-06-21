"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectQuickBooksButton } from "@/components/connect-quickbooks-button";
import { OnboardingImportStats } from "@/components/onboarding-import-stats";
import { OnboardingInfoBox } from "@/components/onboarding-shell";
import { api, getToken } from "@/lib/api";

type ImportChoice = "quickbooks" | "csv";
type ImportPhase = "choose" | "results";

type Props = {
  onBack: () => void;
  onContinue: () => void;
  onConnectQuickBooks: () => void;
  qbConnecting: boolean;
  qbError?: string | null;
  importMessage?: string;
  importSyncing?: boolean;
  invoiceCount?: number;
  totalOutstanding?: number;
  oldestDays?: number;
  avgDays?: number;
  onInvoicesChanged?: () => void;
};

function OptionCard({
  selected,
  onSelect,
  icon,
  title,
  badge,
  description,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  badge?: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border-2 p-4 text-left transition-colors ${
        selected ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
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

export function OnboardingImportStep({
  onBack,
  onContinue,
  onConnectQuickBooks,
  qbConnecting,
  qbError,
  importMessage,
  importSyncing,
  invoiceCount = 0,
  totalOutstanding = 0,
  oldestDays = 0,
  avgDays = 0,
  onInvoicesChanged,
}: Props) {
  const [phase, setPhase] = useState<ImportPhase>("choose");
  const [choice, setChoice] = useState<ImportChoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [qbConnected, setQbConnected] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkQbStatus = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const status = await api.qbSyncStatus(token);
      setQbConnected(Boolean(status.connected));
    } catch {
      setQbConnected(false);
    }
  }, []);

  useEffect(() => {
    void checkQbStatus();
  }, [checkQbStatus, importSyncing]);

  useEffect(() => {
    if (qbConnected) setChoice("quickbooks");
  }, [qbConnected]);

  useEffect(() => {
    if (uploadResult) setChoice("csv");
  }, [uploadResult]);

  const importComplete =
    (choice === "quickbooks" && qbConnected && !importSyncing) ||
    (choice === "csv" && uploadResult !== null && !uploading);

  useEffect(() => {
    if (importComplete) setPhase("results");
  }, [importComplete]);

  useEffect(() => {
    if ((qbConnected || invoiceCount > 0) && !importSyncing) {
      setPhase("results");
      if (qbConnected) setChoice("quickbooks");
    }
  }, [qbConnected, invoiceCount, importSyncing]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getToken();
    if (!token) return;

    setError(null);
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await api.importInvoicesCsv(token, file);
      setUploadResult({ imported: result.imported, skipped: result.skipped });
      setChoice("csv");
      setPhase("results");
      onInvoicesChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const qbReady = qbConnected && !importSyncing;

  let primaryLabel = "Choose an option above";
  let primaryDisabled = !choice;

  if (phase === "results") {
    primaryLabel = importSyncing ? "Syncing…" : "Continue to email setup";
    primaryDisabled = Boolean(importSyncing);
  } else if (choice === "quickbooks") {
    if (importSyncing) {
      primaryLabel = "Syncing from QuickBooks…";
      primaryDisabled = true;
    } else if (qbReady) {
      primaryLabel = "See your invoices";
      primaryDisabled = false;
    } else {
      primaryLabel = qbConnecting ? "Connecting…" : "Connect QuickBooks";
      primaryDisabled = qbConnecting;
    }
  } else if (choice === "csv") {
    primaryLabel = uploading ? "Uploading…" : "Choose a file to upload";
    primaryDisabled = uploading || true;
  }

  function handlePrimary() {
    if (phase === "results") {
      if (!importSyncing) onContinue();
      return;
    }
    if (choice === "quickbooks") {
      if (qbReady) {
        setPhase("results");
        onInvoicesChanged?.();
        return;
      }
      onConnectQuickBooks();
    }
  }

  function changeImportMethod() {
    setPhase("choose");
    setError(null);
  }

  return (
    <div className="space-y-5">
      {phase === "choose" && (
        <p className="text-sm leading-relaxed text-muted">
          Bring in your unpaid invoices so GentleTap can draft reminders. Connect QuickBooks for automatic sync, or
          upload a spreadsheet.
        </p>
      )}

      {(qbError || error) && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {qbError || error}
        </p>
      )}

      {phase === "results" && (
        <>
          <OnboardingImportStats
            invoiceCount={invoiceCount}
            totalOutstanding={totalOutstanding}
            oldestDays={oldestDays}
            avgDays={avgDays}
            syncing={importSyncing}
          />
          <button type="button" className="text-sm text-muted hover:text-foreground" onClick={changeImportMethod}>
            Change import method
          </button>
        </>
      )}

      {phase === "choose" && (
        <div className="space-y-3">
          <OptionCard
            selected={choice === "quickbooks"}
            onSelect={() => setChoice("quickbooks")}
            badge="Recommended"
            title="Connect QuickBooks"
            description="Import unpaid invoices automatically. Read-only — nothing is changed in QuickBooks."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          >
            {choice === "quickbooks" && !qbConnected && (
              <div className="mt-4 flex justify-center">
                <ConnectQuickBooksButton onClick={onConnectQuickBooks} busy={qbConnecting} />
              </div>
            )}
            {qbConnected && <p className="mt-2 text-xs text-green">QuickBooks connected</p>}
            {choice === "quickbooks" && importSyncing && (
              <p className="mt-2 text-xs text-muted animate-pulse">{importMessage ?? "Syncing…"}</p>
            )}
          </OptionCard>

          <OptionCard
            selected={choice === "csv"}
            onSelect={() => setChoice("csv")}
            title="Upload invoice spreadsheet"
            description="CSV or Excel (.xlsx) with client name, client email, amount, and due date."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-3-3m3 3l3-3M4 20h16" />
              </svg>
            }
          >
            {choice === "csv" && (
              <div className="mt-4 space-y-3">
                <OnboardingInfoBox>
                  Required columns: <strong>client_name</strong> (or customer), <strong>client_email</strong> (or
                  email), <strong>amount</strong> (or balance), <strong>due_date</strong>. Optional: invoice_number,
                  currency.
                </OnboardingInfoBox>
                <label className="btn-secondary inline-flex cursor-pointer py-2 text-sm">
                  {uploading ? "Uploading…" : "Choose file"}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
                {uploadResult && (
                  <p className="text-sm text-muted">
                    Imported {uploadResult.imported} invoice{uploadResult.imported === 1 ? "" : "s"}
                    {uploadResult.skipped > 0 ? ` · ${uploadResult.skipped} row(s) skipped` : ""}
                  </p>
                )}
              </div>
            )}
          </OptionCard>
        </div>
      )}

      <button type="button" className="btn-primary w-full" disabled={primaryDisabled} onClick={handlePrimary}>
        {primaryLabel}
      </button>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
