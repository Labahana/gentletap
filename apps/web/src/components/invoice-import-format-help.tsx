"use client";

import { useState } from "react";
import {
  INVOICE_IMPORT_DOWNLOAD_SAMPLES,
  INVOICE_IMPORT_REQUIRED_HINT,
  INVOICE_IMPORT_SAMPLE_COLUMNS,
  INVOICE_IMPORT_SAMPLE_ROWS,
} from "@/lib/invoice-import-samples";

function formatCell(value: string | number | undefined): string {
  if (value === undefined || value === "") return "—";
  return String(value);
}

export function InvoiceImportFormatHelp() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="text-xs text-muted">
      <p>Accepted: .csv, .xlsx, .xls — same column layout.</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          className="font-medium text-accent hover:underline"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? "Hide sample" : "See sample"}
        </button>
        {INVOICE_IMPORT_DOWNLOAD_SAMPLES.map((f, i) => (
          <span key={f.ext} className="inline-flex items-center gap-3">
            {i > 0 && <span aria-hidden className="text-border">·</span>}
            <a href={f.sampleUrl} className="font-medium text-accent hover:underline" download>
              Download sample {f.label}
            </a>
          </span>
        ))}
      </div>

      {expanded && (
        <div className="mt-3 rounded-xl border border-border bg-background/60 p-4">
          <p className="text-sm font-medium text-foreground">Spreadsheet format</p>
          <p className="mt-1">{INVOICE_IMPORT_REQUIRED_HINT}</p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  {INVOICE_IMPORT_SAMPLE_COLUMNS.map((col) => (
                    <th key={col} className="py-2 pr-3 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVOICE_IMPORT_SAMPLE_ROWS.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 text-foreground/90">
                    {INVOICE_IMPORT_SAMPLE_COLUMNS.map((col) => (
                      <td key={col} className="py-2 pr-3 font-mono">
                        {formatCell(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
