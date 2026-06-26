"use client";

type Props = {
  annual: boolean;
  onChange: (annual: boolean) => void;
};

export function BillingIntervalToggle({ annual, onChange }: Props) {
  return (
    <div className="flex justify-center">
      <div
        role="radiogroup"
        aria-label="Billing interval"
        className="relative inline-grid grid-cols-2 gap-0 rounded-2xl bg-foreground/[0.04] p-1 ring-1 ring-border/70"
      >
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-y-1 w-[calc(50%-2px)] rounded-xl bg-card shadow-sm ring-1 ring-border/50 transition-[left] duration-200 ease-out ${
            annual ? "left-[calc(50%+1px)]" : "left-1"
          }`}
        />
        <button
          type="button"
          role="radio"
          aria-checked={!annual}
          onClick={() => onChange(false)}
          className={`relative z-10 min-w-[7.5rem] rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
            !annual ? "text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={annual}
          onClick={() => onChange(true)}
          className={`relative z-10 flex min-w-[7.5rem] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
            annual ? "text-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          Annual
          <span className="rounded-md bg-green/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-green">
            −17%
          </span>
        </button>
      </div>
    </div>
  );
}
