"use client";

import type { ReactNode } from "react";

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
  title: string;
  description?: string;
  wide?: boolean;
  children: ReactNode;
};

function StepIcon({ id, active, done }: { id: string; active: boolean; done: boolean }) {
  const stroke = active || done ? "currentColor" : "currentColor";
  const iconClass = active ? "text-white" : done ? "text-accent" : "text-muted";

  const paths: Record<string, ReactNode> = {
    profile: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM6 20v-1a6 6 0 0112 0v1"
      />
    ),
    quickbooks: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 7h16M4 12h16M4 17h10M8 3v4M14 3v4"
      />
    ),
    preview: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16v12H4V6zm0 0l8 6 8-6"
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
      stroke={stroke}
      strokeWidth="1.75"
      aria-hidden
    >
      {paths[id] ?? paths.preview}
    </svg>
  );
}

export function OnboardingInfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-accent/25 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-muted">
      {children}
    </div>
  );
}

export function OnboardingShell({
  steps,
  currentStep,
  maxUnlockedStep,
  onStepSelect,
  title,
  description,
  wide = false,
  children,
}: Props) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-[#eef0f4] px-4 py-6 sm:py-10">
      <div
        className={`mx-auto w-full ${wide ? "max-w-6xl" : "max-w-2xl"} rounded-2xl border border-border bg-card shadow-lg`}
      >
        <div className="border-b border-border px-6 py-6 sm:px-8">
          <h1 className="text-xl font-bold sm:text-2xl">Welcome to GentleTap!</h1>
          <p className="mt-1 text-sm text-muted">
            Let&apos;s get you set up in {steps.length} quick steps
          </p>
        </div>

        <div className="border-b border-border px-6 py-5 sm:px-8">
          <p className="text-center text-xs font-medium text-muted">
            Step {currentStep + 1} of {steps.length}
          </p>
          <div className="mx-auto mt-3 h-1.5 max-w-md overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
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
                            : "border-border bg-background text-muted"
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
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
