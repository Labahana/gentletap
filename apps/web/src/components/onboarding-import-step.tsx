"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectQuickBooksButton } from "@/components/connect-quickbooks-button";
import { OnboardingImportStats } from "@/components/onboarding-import-stats";
import { InvoiceImportFormatHelp } from "@/components/invoice-import-format-help";
import { api, IDLE_FB_SYNC_STATUS } from "@/lib/api";

type ImportChoice = "quickbooks" | "freshbooks" | "csv" | "manual";
type ImportPhase = "choose" | "results";

type Props = {
  onBack: () => void;
  onContinue: () => void;
  onConnectQuickBooks: () => void;
  onConnectFreshBooks: () => void;
  qbConnecting: boolean;
  fbConnecting: boolean;
  qbError?: string | null;
  fbError?: string | null;
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
  onConnectFreshBooks,
  qbConnecting,
  fbConnecting,
  qbError,
  fbError,
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
  const [fbConnected, setFbConnected] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manual, setManual] = useState({
    client_name: "",
    client_email: "",
    amount: "",
    due_date: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const checkAccountingStatus = useCallback(async () => {
    try {
      const [qb, fb] = await Promise.all([
        api.qbSyncStatus(),
        api.fbSyncStatus().catch(() => IDLE_FB_SYNC_STATUS),
      ]);
      setQbConnected(Boolean(qb.connected));
      setFbConnected(Boolean(fb.connected));
    } catch {
      setQbConnected(false);
      setFbConnected(false);
    }
  }, []);

  useEffect(() => {
    void checkAccountingStatus();
  }, [checkAccountingStatus, importSyncing]);

  useEffect(() => {
    if (qbConnected) setChoice("quickbooks");
    else if (fbConnected) setChoice("freshbooks");
  }, [qbConnected, fbConnected]);

  useEffect(() => {
    if (uploadResult) setChoice("csv");
  }, [uploadResult]);

  const importComplete =
    (choice === "quickbooks" && qbConnected && !importSyncing) ||
    (choice === "freshbooks" && fbConnected && !importSyncing) ||
    (choice === "csv" && uploadResult !== null && !uploading);

  useEffect(() => {
    if (importComplete) setPhase("results");
  }, [importComplete]);

  useEffect(() => {
    if ((qbConnected || fbConnected || invoiceCount > 0) && !importSyncing) {
      setPhase("results");
      if (qbConnected) setChoice("quickbooks");
      else if (fbConnected) setChoice("freshbooks");
    }
  }, [qbConnected, fbConnected, invoiceCount, importSyncing]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await api.importInvoicesCsv(file);
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

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const amount = parseFloat(manual.amount);
    if (!manual.client_name.trim() || !manual.client_email.trim() || !manual.due_date || !(amount > 0)) {
      setError("Enter client name, email, amount, and due date");
      return;
    }
    setManualSaving(true);
    try {
      await api.createInvoice({
        client_name: manual.client_name.trim(),
        client_email: manual.client_email.trim(),
        amount,
        due_date: manual.due_date,
      });
      setUploadResult({ imported: 1, skipped: 0 });
      setChoice("manual");
      setPhase("results");
      onInvoicesChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add invoice");
    } finally {
      setManualSaving(false);
    }
  }

  const qbReady = qbConnected && !importSyncing;
  const fbReady = fbConnected && !importSyncing;

  let primaryLabel = "Choose an option above";
  let primaryDisabled = !choice;

  if (phase === "results") {
    primaryLabel = importSyncing ? "Syncing…" : "Connect email to send reminders";
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
  } else if (choice === "freshbooks") {
    if (importSyncing) {
      primaryLabel = "Syncing from FreshBooks…";
      primaryDisabled = true;
    } else if (fbReady) {
      primaryLabel = "See your invoices";
      primaryDisabled = false;
    } else {
      primaryLabel = fbConnecting ? "Connecting…" : "Connect FreshBooks";
      primaryDisabled = fbConnecting;
    }
  } else if (choice === "csv") {
    primaryLabel = uploading ? "Uploading…" : "Choose a file to upload";
    primaryDisabled = uploading;
  } else if (choice === "manual") {
    primaryLabel = "Add the invoice above";
    primaryDisabled = manualSaving;
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
    if (choice === "freshbooks") {
      if (fbReady) {
        setPhase("results");
        onInvoicesChanged?.();
        return;
      }
      onConnectFreshBooks();
    }
    if (choice === "csv") {
      fileInputRef.current?.click();
      return;
    }
    if (choice === "manual") {
      // Submit handled by the inline form's own button.
      return;
    }
  }

  function changeImportMethod() {
    setPhase("choose");
    setError(null);
  }

  const displayError = qbError || fbError || error;

  return (
    <div className="space-y-5">
      {phase === "choose" && (
        <p className="text-sm leading-relaxed text-muted">
          Bring in your unpaid invoices so GentleTap can draft reminders. Connect QuickBooks or FreshBooks for
          automatic sync, or upload a spreadsheet.
        </p>
      )}

      {displayError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {displayError}
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
            badge="Popular"
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
            selected={choice === "freshbooks"}
            onSelect={() => setChoice("freshbooks")}
            title="Connect FreshBooks"
            description="Import outstanding invoices automatically. Read-only — nothing is changed in FreshBooks."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h10" />
              </svg>
            }
          >
            {choice === "freshbooks" && !fbConnected && (
              <div className="mt-4">
                <button
                  type="button"
                  className="btn-primary w-full text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConnectFreshBooks();
                  }}
                  disabled={fbConnecting}
                >
                  {fbConnecting ? "Connecting…" : "Connect FreshBooks"}
                </button>
              </div>
            )}
            {fbConnected && <p className="mt-2 text-xs text-green">FreshBooks connected</p>}
            {choice === "freshbooks" && importSyncing && (
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
              <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                <InvoiceImportFormatHelp />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  className="btn-secondary w-full text-sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? "Uploading…" : "Choose file"}
                </button>
              </div>
            )}
          </OptionCard>

          <OptionCard
            selected={choice === "manual"}
            onSelect={() => setChoice("manual")}
            title="Add one manually"
            description="No accounting software or spreadsheet? Type in a single unpaid invoice to get started."
            icon={
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
              </svg>
            }
          >
            {choice === "manual" && (
              <form className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()} onSubmit={handleManualAdd}>
                <input
                  className="input w-full text-sm"
                  placeholder="Client name"
                  value={manual.client_name}
                  onChange={(e) => setManual((m) => ({ ...m, client_name: e.target.value }))}
                  required
                />
                <input
                  className="input w-full text-sm"
                  type="email"
                  placeholder="Client email"
                  value={manual.client_email}
                  onChange={(e) => setManual((m) => ({ ...m, client_email: e.target.value }))}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="input w-full text-sm"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="Amount"
                    value={manual.amount}
                    onChange={(e) => setManual((m) => ({ ...m, amount: e.target.value }))}
                    required
                  />
                  <input
                    className="input w-full text-sm"
                    type="date"
                    value={manual.due_date}
                    onChange={(e) => setManual((m) => ({ ...m, due_date: e.target.value }))}
                    required
                  />
                </div>
                <button type="submit" className="btn-primary w-full text-sm" disabled={manualSaving}>
                  {manualSaving ? "Adding…" : "Add invoice"}
                </button>
              </form>
            )}
          </OptionCard>
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onBack}>
          Back
        </button>
        <div className="flex w-full flex-col items-center gap-2 sm:w-auto sm:flex-row">
          {phase === "choose" && (
            <button
              type="button"
              className="text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
              onClick={onContinue}
            >
              I don&apos;t have unpaid invoices — skip for now
            </button>
          )}
          <button
            type="button"
            className="btn-primary w-full sm:w-auto"
            disabled={primaryDisabled}
            onClick={handlePrimary}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
