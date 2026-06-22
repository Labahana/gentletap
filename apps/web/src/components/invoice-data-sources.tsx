"use client";

import Link from "next/link";
import { useRef } from "react";

export function InvoiceDataSources({
  onUpload,
  uploadBusy,
  uploadNote,
  compact,
}: {
  onUpload: (file: File) => void;
  uploadBusy?: boolean;
  uploadNote?: string | null;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
        <Link href="/settings/integrations" className="btn-secondary py-1.5 px-4 text-xs">
          Connect QuickBooks
        </Link>
        <button
          type="button"
          className="btn-secondary py-1.5 px-4 text-xs"
          disabled={uploadBusy}
          onClick={() => fileRef.current?.click()}
        >
          {uploadBusy ? "Uploading…" : "Upload spreadsheet"}
        </button>
      </div>
    );
  }

  return (
    <div className="card !p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Add invoices</h2>
          <p className="mt-0.5 text-xs text-muted">
            Sync from QuickBooks automatically, or import a CSV / Excel file.
          </p>
          {uploadNote && (
            <p className="mt-2 text-xs font-medium text-green">{uploadNote}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
          <Link href="/settings/integrations" className="btn-primary py-2 px-4 text-xs">
            Connect QuickBooks
          </Link>
          <button
            type="button"
            className="btn-secondary py-2 px-4 text-xs"
            disabled={uploadBusy}
            onClick={() => fileRef.current?.click()}
          >
            {uploadBusy ? "Uploading…" : "Upload spreadsheet"}
          </button>
        </div>
      </div>
    </div>
  );
}
