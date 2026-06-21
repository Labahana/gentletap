"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectQuickBooksButton } from "@/components/connect-quickbooks-button";
import { OnboardingInfoBox } from "@/components/onboarding-shell";
import { api, getToken } from "@/lib/api";
import { formatMoney } from "@/lib/onboarding";

type ImportChoice = "quickbooks" | "csv";

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
  onInvoicesChanged,
}: Props) {
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
      onInvoicesChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const hasInvoices = invoiceCount > 0 || (uploadResult?.imported ?? 0) > 0;
  const qbReady = qbConnected && !importSyncing;
  const csvReady = uploadResult !== null && !uploading;

  let primaryLabel = "Choose an option above";
  let primaryDisabled = !choice;

  if (choice === "quickbooks") {
    if (importSyncing) {
      primaryLabel = "Syncing from QuickBooks…";
      primaryDisabled = true;
    } else if (qbReady) {
      primaryLabel = hasInvoices ? "Continue" : "Continue without invoices";
      primaryDisabled = false;
    } else {
      primaryLabel = qbConnecting ? "Connecting…" : "Connect QuickBooks";
      primaryDisabled = qbConnecting;
    }
  } else if (choice === "csv") {
    if (uploading) {
      primaryLabel = "Uploading…";
      primaryDisabled = true;
    } else if (csvReady) {
      primaryLabel = uploadResult!.imported > 0 ? "Continue" : "Continue without invoices";
      primaryDisabled = false;
    } else {
      primaryLabel = "Choose a file to upload";
      primaryDisabled = true;
    }
  }

  function handlePrimary() {
    if (choice === "quickbooks") {
      if (qbReady) {
        onContinue();
        return;
      }
      onConnectQuickBooks();
      return;
    }
    if (choice === "csv" && csvReady) {
      onContinue();
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-muted">
        Bring in your unpaid invoices so GentleTap can draft reminders. Connect QuickBooks for automatic sync, or
        upload a spreadsheet.
      </p>

      {(qbError || error) && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {qbError || error}
        </p>
      )}

      {importSyncing && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-muted animate-pulse">
          {importMessage ?? "Syncing invoices from QuickBooks…"}
        </div>
      )}

      {hasInvoices && !importSyncing && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-6 text-center">
          <p className="text-sm font-medium text-accent">Ready to continue</p>
          <p className="mt-1 text-2xl font-bold">{invoiceCount || uploadResult?.imported}</p>
          <p className="text-sm text-muted">unpaid invoice{(invoiceCount || uploadResult?.imported) === 1 ? "" : "s"}</p>
          {totalOutstanding > 0 && (
            <p className="mt-2 text-lg font-semibold">{formatMoney(totalOutstanding)} outstanding</p>
          )}
        </div>
      )}

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
          {qbConnected && (
            <p className="mt-2 text-xs text-green">QuickBooks connected</p>
          )}
        </OptionCard>

        <OptionCard
          selected={choice === "csv"}
          onSelect={() => setChoice("csv")}
          title="Upload invoice spreadsheet"
          description="CSV or Excel (.xlsx) with client name, amount, and due date."
          icon={
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-3-3m3 3l3-3M4 20h16" />
            </svg>
          }
        >
          {choice === "csv" && (
            <div className="mt-4 space-y-3">
              <OnboardingInfoBox>
                Required columns: <strong>client_name</strong> (or customer), <strong>amount</strong> (or balance),{" "}
                <strong>due_date</strong>. Optional: client_email, invoice_number, currency.
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
