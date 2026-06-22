import { LEGAL } from "@/lib/legal";

export function LegalEntityBlock() {
  return (
    <div className="rounded-xl border border-border bg-card/50 px-4 py-3 text-sm not-prose">
      <p className="font-medium">{LEGAL.legalName}</p>
      <p className="mt-1 text-muted">{LEGAL.productName} — payment reminder software</p>
      <p className="mt-2 whitespace-pre-line text-muted">{LEGAL.legalAddress}</p>
      <p className="mt-2">
        <a href={`mailto:${LEGAL.supportEmail}`} className="text-accent hover:underline">
          {LEGAL.supportEmail}
        </a>
      </p>
    </div>
  );
}
