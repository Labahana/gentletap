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

export function InvoiceImportFormatHelp({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="text-xs text-muted">
        <p>{INVOICE_IMPORT_REQUIRED_HINT}</p>
        <p className="mt-2">
          {INVOICE_IMPORT_DOWNLOAD_SAMPLES.map((f, i) => (
            <span key={f.ext}>
              {i > 0 && " · "}
              <a href={f.sampleUrl} className="text-accent hover:underline" download>
                Sample {f.label}
              </a>
            </span>
          ))}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <p className="text-sm font-medium">Spreadsheet format</p>
      <p className="mt-1 text-xs text-muted">{INVOICE_IMPORT_REQUIRED_HINT}</p>
      <p className="mt-2 text-xs text-muted">
        Accepted file types: <strong className="text-foreground">.csv</strong>,{" "}
        <strong className="text-foreground">.xlsx</strong>,{" "}
        <strong className="text-foreground">.xls</strong> — all use the same column layout.
      </p>

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

      <div className="mt-4 flex flex-wrap gap-2">
        {INVOICE_IMPORT_DOWNLOAD_SAMPLES.map((f) => (
          <a
            key={f.ext}
            href={f.sampleUrl}
            download
            className="btn-secondary py-1.5 px-3 text-xs"
          >
            Download sample {f.label}
          </a>
        ))}
      </div>
    </div>
  );
}
