/** Sample rows for invoice spreadsheet import — keep in sync with csv_import.SAMPLE_IMPORT_ROWS */

export const INVOICE_IMPORT_SAMPLE_COLUMNS = [
  "client_name",
  "client_email",
  "client_phone",
  "invoice_number",
  "amount",
  "due_date",
  "currency",
] as const;

export type InvoiceImportSampleColumn = (typeof INVOICE_IMPORT_SAMPLE_COLUMNS)[number];

export const INVOICE_IMPORT_SAMPLE_ROWS: ReadonlyArray<
  Partial<Record<InvoiceImportSampleColumn, string | number>>
> = [
  {
    client_name: "Acme Design Co",
    client_email: "billing@acmedesign.com",
    client_phone: "+14155550198",
    invoice_number: "INV-1042",
    amount: 2500,
    due_date: "2026-03-15",
    currency: "USD",
  },
  {
    client_name: "Northline Studio",
    client_email: "accounts@northline.io",
    invoice_number: "INV-1043",
    amount: 875.5,
    due_date: "2026-02-28",
    currency: "USD",
  },
  {
    client_name: "Brightpath Consulting",
    client_email: "ap@brightpath.co",
    amount: 1200,
    due_date: "2026-04-01",
  },
];

export const INVOICE_IMPORT_DOWNLOAD_SAMPLES = [
  { ext: "csv", label: "CSV", sampleUrl: "/v1/invoices/import-sample?format=csv" },
  { ext: "xlsx", label: "Excel (.xlsx)", sampleUrl: "/v1/invoices/import-sample?format=xlsx" },
] as const;

export const INVOICE_IMPORT_FORMATS = [
  ...INVOICE_IMPORT_DOWNLOAD_SAMPLES,
  { ext: "xls", label: "Excel (.xls)", note: "Same columns as .xlsx" },
] as const;

export const INVOICE_IMPORT_REQUIRED_HINT =
  "Required: client_name, client_email, amount (or balance), due_date. Optional: invoice_number, currency, client_phone.";
