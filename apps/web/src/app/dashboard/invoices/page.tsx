"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FilterChips,
  InvoiceMobileCard,
  InvoiceOverviewRow,
  InvoiceSectionHeader,
  SourceFilterChips,
} from "@/components/dashboard-parts";
import { DashboardShell } from "@/components/dashboard-shell";
import { api, getToken, type InvoiceItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  filterBySource,
  filterCounts,
  filterInvoices,
  invoiceSourceOf,
  sourceFilterCounts,
  type InvoiceFilter,
  type InvoiceSourceFilter,
} from "@/lib/dashboard-ui";
import { isOnboardingComplete } from "@/lib/onboarding";
import { hasWhatsapp } from "@/lib/pricing";

type ImportBatch = Awaited<ReturnType<typeof api.importHistory>>["items"][number];

function InvoiceList({
  items,
  variant,
  onMarkPaid,
  markPaidBusy,
  showWhatsappHints,
  bulkMode,
  selectedIds,
  onToggleSelect,
}: {
  items: InvoiceItem[];
  variant: "mobile" | "desktop";
  onMarkPaid?: (id: string) => void;
  markPaidBusy?: string | null;
  showWhatsappHints?: boolean;
  bulkMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  if (items.length === 0) return null;
  const rowProps = {
    onMarkPaid,
    markPaidBusy,
    showWhatsappHints,
    selectable: bulkMode,
    selectedIds,
    onToggleSelect,
  };
  if (variant === "mobile") {
    return (
      <>
        {items.map((inv) => (
          <InvoiceMobileCard
            key={inv.id}
            inv={inv}
            {...rowProps}
            selected={selectedIds?.has(inv.id)}
          />
        ))}
      </>
    );
  }
  return (
    <div className="card hidden !p-4 lg:block">
      {items.map((inv) => (
        <InvoiceOverviewRow
          key={inv.id}
          inv={inv}
          {...rowProps}
          selected={selectedIds?.has(inv.id)}
        />
      ))}
    </div>
  );
}

function GroupedInvoiceLists({
  items,
  showGrouped,
  onMarkPaid,
  markPaidBusy,
  showWhatsappHints,
  bulkMode,
  selectedIds,
  onToggleSelect,
}: {
  items: InvoiceItem[];
  showGrouped: boolean;
  onMarkPaid?: (id: string) => void;
  markPaidBusy?: string | null;
  showWhatsappHints?: boolean;
  bulkMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}) {
  const listProps = {
    onMarkPaid,
    markPaidBusy,
    showWhatsappHints,
    bulkMode,
    selectedIds,
    onToggleSelect,
  };

  if (!showGrouped) {
    return (
      <>
        <div className="lg:hidden">
          <InvoiceList items={items} variant="mobile" {...listProps} />
        </div>
        <InvoiceList items={items} variant="desktop" {...listProps} />
      </>
    );
  }

  const qb = items.filter((i) => invoiceSourceOf(i) === "quickbooks");
  const upload = items.filter((i) => invoiceSourceOf(i) === "upload");

  return (
    <div className="space-y-4">
      {qb.length > 0 && (
        <div>
          <InvoiceSectionHeader title="QuickBooks" subtitle="Auto-synced balances and payment detection" />
          <div className="lg:hidden">
            <InvoiceList items={qb} variant="mobile" showWhatsappHints={showWhatsappHints} />
          </div>
          <InvoiceList items={qb} variant="desktop" showWhatsappHints={showWhatsappHints} />
        </div>
      )}
      {upload.length > 0 && (
        <div>
          <InvoiceSectionHeader title="Uploaded" subtitle="Mark paid or edit balances when things change" />
          <div className="lg:hidden">
            <InvoiceList items={upload} variant="mobile" {...listProps} />
          </div>
          <InvoiceList items={upload} variant="desktop" {...listProps} />
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<InvoiceSourceFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [monthlyUsed, setMonthlyUsed] = useState<number | undefined>();
  const [monthlyLimit, setMonthlyLimit] = useState<number | undefined>();
  const [uploadAttention, setUploadAttention] = useState(0);
  const [uploadCount, setUploadCount] = useState(0);
  const [markPaidBusy, setMarkPaidBusy] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [importHistory, setImportHistory] = useState<ImportBatch[]>([]);
  const [showImportHistory, setShowImportHistory] = useState(false);

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const [inv, summary, notes, history] = await Promise.all([
        api.invoices(token),
        api.invoicesSummary(token),
        api.notifications(token),
        api.importHistory(token),
      ]);
      setInvoices(inv.items);
      setImportHistory(history.items);
      setUnreadAlerts(notes.items.filter((n) => !n.read).length);
      setMonthlyUsed(summary.monthly_collections?.monthly_used);
      setMonthlyLimit(summary.monthly_collections?.monthly_limit);
      setUploadCount(summary.sources?.upload_count ?? 0);
      setUploadAttention(summary.sources?.upload_needs_attention ?? 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  useEffect(() => {
    if (user && !isOnboardingComplete(user)) router.replace("/onboarding");
  }, [user, router]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  async function handleMarkPaid(invoiceId: string) {
    const token = getToken();
    if (!token) return;
    if (!window.confirm("Mark this invoice as paid? Reminders will stop.")) return;
    setMarkPaidBusy(invoiceId);
    setError(null);
    try {
      await api.markInvoicePaid(token, invoiceId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark invoice paid");
    } finally {
      setMarkPaidBusy(null);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkMarkPaid() {
    const token = getToken();
    if (!token || selectedIds.size === 0) return;
    if (!window.confirm(`Mark ${selectedIds.size} invoice(s) as paid? Reminders will stop.`)) return;
    setBulkBusy(true);
    setError(null);
    try {
      const result = await api.bulkMarkInvoicesPaid(token, [...selectedIds]);
      if (result.errors.length > 0) {
        setError(`${result.paid_count} marked paid. ${result.errors.length} could not be updated.`);
      }
      setSelectedIds(new Set());
      setBulkMode(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk mark paid failed");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleUpload(file: File) {
    const token = getToken();
    if (!token) return;
    setUploadBusy(true);
    setUploadNote(null);
    setError(null);
    try {
      const result = await api.importInvoicesCsv(token, file);
      setUploadNote(`Imported ${result.imported} invoice${result.imported === 1 ? "" : "s"} from spreadsheet.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading || !user) {
    return (
      <DashboardShell>
        <div className="flex items-center justify-center py-40">
          <div className="h-6 w-32 animate-pulse rounded-xl bg-border" />
        </div>
      </DashboardShell>
    );
  }

  const bySource = filterBySource(invoices, sourceFilter);
  const filtered = filterInvoices(bySource, filter);
  const statusCounts = filterCounts(bySource);
  const sourceCounts = sourceFilterCounts(invoices);
  const showGrouped =
    sourceFilter === "all" &&
    filter === "all" &&
    sourceCounts.quickbooks > 0 &&
    sourceCounts.upload > 0;
  const showWhatsappHints = hasWhatsapp(user.plan);
  const uploadUnpaid = filtered.filter((i) => invoiceSourceOf(i) === "upload" && i.balance > 0);

  return (
    <DashboardShell alertCount={unreadAlerts} monthlyUsed={monthlyUsed} monthlyLimit={monthlyLimit}>
      <div className="px-3.5 py-5 sm:px-5 lg:px-6 lg:py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-base font-medium lg:text-[16px]">Invoices</h1>
            <p className="mt-0.5 text-[11px] text-muted">
              {invoices.length} invoice{invoices.length === 1 ? "" : "s"} ·{" "}
              <Link href="/dashboard" className="text-accent hover:underline">
                Add more on Overview
              </Link>
            </p>
          </div>
          {(uploadUnpaid.length > 0 || importHistory.length > 0) && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUpload(file);
                }}
              />
              {uploadUnpaid.length > 0 && (
                <button
                  type="button"
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-background"
                  onClick={() => {
                    setBulkMode((v) => !v);
                    setSelectedIds(new Set());
                  }}
                >
                  {bulkMode ? "Cancel bulk" : "Bulk mark paid"}
                </button>
              )}
              {importHistory.length > 0 && (
                <button
                  type="button"
                  className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-background"
                  onClick={() => setShowImportHistory((v) => !v)}
                >
                  {showImportHistory ? "Hide history" : "Upload history"}
                </button>
              )}
            </div>
          )}
        </div>

        {showImportHistory && importHistory.length > 0 && (
          <div className="mt-3 card !p-3">
            <p className="text-xs font-medium text-muted">Recent spreadsheet uploads</p>
            <ul className="mt-2 space-y-2">
              {importHistory.map((batch) => (
                <li key={batch.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{batch.filename}</span>
                  <span className="text-xs text-muted">
                    {batch.imported_count} imported · {batch.skipped_count} skipped ·{" "}
                    {new Date(batch.created_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {bulkMode && selectedIds.size > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/80 px-3 py-2">
            <span className="text-sm">{selectedIds.size} selected</span>
            <button
              type="button"
              className="btn-primary py-1 text-xs"
              disabled={bulkBusy}
              onClick={() => void handleBulkMarkPaid()}
            >
              {bulkBusy ? "Updating…" : "Mark selected paid"}
            </button>
          </div>
        )}

        {uploadNote && (
          <div className="mt-3 rounded-xl border border-green/30 bg-green/10 px-3 py-2 text-sm text-green">{uploadNote}</div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-red/30 bg-red/5 px-3 py-2 text-sm text-red">{error}</div>
        )}

        {(sourceFilter === "upload" || uploadAttention > 0) && uploadCount > 0 && (
          <div className="mt-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3.5 py-3 text-sm text-amber-950 dark:text-amber-50">
            <p className="font-medium">
              {uploadAttention > 0
                ? `${uploadAttention} uploaded invoice${uploadAttention === 1 ? "" : "s"} need attention`
                : `${uploadCount} uploaded invoice${uploadCount === 1 ? "" : "s"}`}
            </p>
            <p className="mt-1 text-xs opacity-90">
              Balances don&apos;t sync from QuickBooks. Re-upload your spreadsheet when amounts change, or open an
              invoice to review.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-amber-700/30 bg-background/80 px-2.5 py-1 text-xs font-medium"
                disabled={uploadBusy}
                onClick={() => fileRef.current?.click()}
              >
                Upload updated file
              </button>
              {sourceFilter !== "upload" && (
                <button
                  type="button"
                  className="rounded-lg border border-amber-700/30 bg-background/80 px-2.5 py-1 text-xs font-medium"
                  onClick={() => setSourceFilter("upload")}
                >
                  Show uploaded only
                </button>
              )}
            </div>
          </div>
        )}

        <div className="mt-3.5 space-y-2">
          <SourceFilterChips value={sourceFilter} onChange={setSourceFilter} counts={sourceCounts} />
          <FilterChips value={filter} onChange={setFilter} counts={statusCounts} />
        </div>

        <div className="mt-3">
          {filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted">
                {invoices.length === 0 ? (
                  <>
                    No invoices yet.{" "}
                    <Link href="/dashboard" className="text-accent underline">
                      Add invoices on Overview
                    </Link>
                    .
                  </>
                ) : (
                  "No invoices match this filter."
                )}
              </p>
            </div>
          ) : (
            <GroupedInvoiceLists
              items={filtered}
              showGrouped={showGrouped}
              onMarkPaid={handleMarkPaid}
              markPaidBusy={markPaidBusy}
              showWhatsappHints={showWhatsappHints}
              bulkMode={bulkMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
