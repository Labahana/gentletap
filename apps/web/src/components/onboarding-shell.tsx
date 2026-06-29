"use client";

import { useEffect, type ReactNode } from "react";

export type OnboardingStepDef = {
  id: string;
  label: string;
  subtitle: string;
};

type Props = {
  steps: OnboardingStepDef[];
  currentStep: number;
  maxUnlockedStep: number;
  onStepSelect?: (index: number) => void;
  onClose?: () => void;
  title: string;
  description?: string;
  children: ReactNode;
};

function StepIcon({ id, active, done }: { id: string; active: boolean; done: boolean }) {
  const iconClass = active ? "text-white" : done ? "text-accent" : "text-muted";

  const paths: Record<string, ReactNode> = {
    profile: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM6 20v-1a6 6 0 0112 0v1"
      />
    ),
    preview: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16v12H4V6zm0 0l8 6 8-6"
      />
    ),
    import: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M4 12h16M4 17h10M8 3v4M14 3v4"
      />
    ),
    quickbooks: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M4 12h16M4 17h10M8 3v4M14 3v4"
      />
    ),
    email: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 8l8 5 8-5v10H4V8z"
      />
    ),
    invoice: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h12v16H6V6zm3 4h6m-6 4h4"
      />
    ),
    pricing: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h12v16H6V6zm3 4h6m-6 4h4"
      />
    ),
  };

  return (
    <svg
      className={`h-5 w-5 ${iconClass}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden
    >
      {paths[id] ?? paths.preview}
    </svg>
  );
}

const BACKDROP_NAV = [
  "Overview",
  "Invoices",
  "Clients",
  "Reminders sent",
  "Analytics",
  "Connections",
  "Settings",
];

function DashboardBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-background" aria-hidden>
      <div className="flex h-full">
        <aside className="hidden w-[196px] shrink-0 flex-col border-r border-border bg-card lg:flex">
          <div className="border-b border-border px-4 pb-3.5 pt-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-accent/20" />
              <div className="h-3.5 w-20 rounded bg-foreground/10" />
            </div>
            <div className="mt-2 h-5 w-24 rounded-full bg-green/15" />
          </div>
          <nav className="flex-1 space-y-0.5 py-2">
            {BACKDROP_NAV.map((label, i) => (
              <div
                key={label}
                className={`flex items-center gap-2 px-4 py-1.5 text-[13px] ${
                  i === 0
                    ? "border-r-2 border-foreground bg-background font-medium text-foreground"
                    : "text-muted"
                }`}
              >
                <div className={`h-4 w-4 rounded-sm ${i === 0 ? "bg-accent/30" : "bg-border"}`} />
                <span>{label}</span>
              </div>
            ))}
          </nav>
          <div className="mx-3 mb-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
            <div className="h-2.5 w-16 rounded bg-accent/30" />
            <div className="mt-2 h-7 w-full rounded-md bg-accent/20" />
          </div>
        </aside>

        <main className="min-w-0 flex-1 lg:ml-0">
          <div className="px-5 py-5 lg:px-6">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <div className="h-4 w-44 rounded bg-foreground/10" />
                <div className="mt-2 h-3 w-32 rounded bg-border" />
              </div>
              <div className="h-8 w-8 rounded-full bg-border" />
            </div>

            <div className="mb-5 rounded-xl border border-yellow/40 bg-yellow/10 px-4 py-3">
              <div className="h-3 w-56 rounded bg-yellow/30" />
              <div className="mt-2 h-7 w-28 rounded-md bg-accent/25" />
            </div>

            <div className="mb-5 h-14 rounded-xl border border-border bg-card" />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="h-2.5 w-20 rounded bg-border" />
                  <div className="mt-3 h-6 w-16 rounded bg-foreground/10" />
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="h-3.5 w-36 rounded bg-foreground/10" />
                <div className="h-7 w-24 rounded-md bg-foreground/5" />
              </div>
              <div className="mt-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 rounded-lg bg-background" />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function OnboardingInfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-900">
      {children}
    </div>
  );
}

export function OnboardingShell({
  steps,
  currentStep,
  maxUnlockedStep,
  onStepSelect,
  onClose,
  title,
  description,
  children,
}: Props) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 min-h-screen">
      <DashboardBackdrop />
      <div className="absolute inset-0 bg-black/50" aria-hidden />

      <div className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div
          className="relative flex h-[85vh] w-[min(100%,780px)] max-h-[85vh] flex-col overflow-hidden rounded-xl bg-white shadow-[0_20px_60px_-12px_rgba(0,0,0,0.35)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-title"
        >
          <button
            type="button"
            onClick={onClose}
            disabled={!onClose}
            className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-lg text-2xl leading-none text-muted transition hover:bg-black/5 hover:text-foreground disabled:cursor-default disabled:opacity-40"
            aria-label="Close onboarding"
          >
            ×
          </button>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="px-6 pb-8 pt-8 sm:px-8 sm:pt-10">
              <h1 id="onboarding-title" className="pr-10 text-2xl font-bold text-foreground">
                Welcome to GentleTap!
              </h1>
              <p className="mt-1 text-sm text-muted">
                Let&apos;s get you set up in {steps.length} quick steps
              </p>

              <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center text-xs font-medium text-muted">
                Step {currentStep + 1} of {steps.length}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                {steps.map((step, index) => {
                  const active = index === currentStep;
                  const unlocked = index <= maxUnlockedStep;
                  const clickable = unlocked && onStepSelect && index !== currentStep;
                  return (
                    <div key={step.id} className="flex flex-col items-center text-center">
                      <button
                        type="button"
                        disabled={!clickable}
                        onClick={() => clickable && onStepSelect(index)}
                        className={`flex flex-col items-center text-center transition-opacity ${
                          clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"
                        }`}
                        aria-label={`${step.label}${active ? " (current step)" : unlocked ? "" : " (locked)"}`}
                        aria-current={active ? "step" : undefined}
                      >
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors ${
                            active
                              ? "border-accent bg-accent text-white"
                              : unlocked
                                ? "border-accent/40 bg-accent/10 text-accent"
                                : "border-border bg-gray-50 text-muted"
                          }`}
                        >
                          <StepIcon id={step.id} active={active} done={unlocked && !active} />
                        </div>
                        <p
                          className={`mt-2 text-xs font-medium leading-tight ${
                            active ? "text-accent" : unlocked ? "text-foreground" : "text-muted"
                          }`}
                        >
                          {step.label}
                        </p>
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="my-6 border-t border-border" />

              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground">{title}</h2>
                {description && <p className="mt-1 text-sm text-muted">{description}</p>}
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function OnboardingLoadingOverlay() {
  return (
    <div className="fixed inset-0 z-50 min-h-screen">
      <DashboardBackdrop />
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative flex min-h-screen items-center justify-center">
        <p className="text-sm text-white/90">Loading…</p>
      </div>
    </div>
  );
}
