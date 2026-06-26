"use client";

import { formatMoney } from "@/lib/onboarding";

type Props = {
  docNumber?: string | null;
  balance: number;
  currency?: string;
  body?: string;
  businessName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  paymentLink?: string | null;
  subject?: string;
  toEmail?: string;
  fromLabel?: string;
  showMeta?: boolean;
};

function headerLabel(docNumber?: string | null): string {
  const doc = (docNumber || "invoice").toString().trim();
  return `Invoice #${doc} · Balance due`;
}

function cleanPreviewBody(body: string, businessName: string): string {
  let text = body
    .replace(/\n*\s*Pay online:\s*https?:\/\/\S+/gi, "")
    .trim();
  const lines = text.split("\n");
  while (lines.length > 1) {
    const last = lines[lines.length - 1]?.trim() ?? "";
    const prev = lines[lines.length - 2]?.trim().toLowerCase() ?? "";
    if (
      last.toLowerCase() === businessName.trim().toLowerCase() ||
      /^(best|thanks|regards|cheers|sincerely)/i.test(prev)
    ) {
      lines.pop();
      if (/^(best|thanks|regards|cheers|sincerely)/i.test(prev)) lines.pop();
      continue;
    }
    break;
  }
  return lines.join("\n").trim();
}

export function ReminderEmailCard({
  docNumber,
  balance,
  currency = "USD",
  body,
  businessName,
  contactEmail,
  contactPhone,
  paymentLink,
  subject,
  toEmail,
  fromLabel,
  showMeta = false,
}: Props) {
  const amount = formatMoney(balance, currency);
  const message = body ? cleanPreviewBody(body, businessName) : "";
  const footerBits = [contactEmail, contactPhone].filter(Boolean);

  return (
    <div className="overflow-hidden rounded-xl border border-[#e8e2da] bg-[#f5f5f3] p-3 shadow-sm">
      {showMeta && (fromLabel || subject || toEmail) && (
        <div className="mb-3 space-y-1 rounded-lg border border-border bg-white/80 px-3 py-2 text-xs">
          {fromLabel && (
            <p>
              <span className="font-medium text-foreground">From:</span>{" "}
              <span className="text-muted">{fromLabel}</span>
            </p>
          )}
          {toEmail && (
            <p>
              <span className="font-medium text-foreground">To:</span>{" "}
              <span className="text-muted">{toEmail}</span>
            </p>
          )}
          {subject && (
            <p>
              <span className="font-medium text-foreground">Subject:</span>{" "}
              <span className="text-foreground">{subject}</span>
            </p>
          )}
        </div>
      )}

      <div className="mx-auto max-w-[480px] overflow-hidden rounded-xl border border-[#e8e2da] bg-white">
        <div className="border-b border-[#dceee0] bg-[#eef7ee] px-4 py-3">
          <p className="text-[13px] font-semibold leading-snug text-[#4a5d4a]">
            {headerLabel(docNumber)}
          </p>
          <p className="mt-1 text-[22px] font-bold leading-tight text-[#1a1a1a]">{amount}</p>
        </div>

        <div className="px-4 py-4 text-sm leading-relaxed text-[#2c2825]">
          {message ? (
            <p className="whitespace-pre-wrap">{message}</p>
          ) : (
            <p className="text-muted">
              GentleTap will draft a short, personalized reminder for this invoice.
            </p>
          )}
        </div>

        {paymentLink && (
          <div className="px-4 pb-4 text-center">
            <span className="inline-block rounded-full bg-[#2e7d32] px-5 py-2.5 text-sm font-semibold text-white">
              View invoice
            </span>
          </div>
        )}

        <div className="border-t border-[#e8e2da] bg-[#faf8f5] px-4 py-3 text-center text-[11px] leading-relaxed text-[#6b6560]">
          <p className="font-semibold text-[#4a4540]">{businessName}</p>
          {footerBits.length > 0 && <p className="mt-1">{footerBits.join(" · ")}</p>}
        </div>
      </div>
    </div>
  );
}
