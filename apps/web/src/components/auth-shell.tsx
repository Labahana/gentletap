"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";

const STATS = [
  { value: "5 free", label: "Collections / month" },
  { value: "QB + FB", label: "Accounting sync" },
  { value: "Auto-stop", label: "The moment you're paid" },
] as const;

const QUOTES = [
  {
    text: "I stopped writing awkward chase emails. GentleTap drafts them in my voice and sends from my Gmail.",
    name: "Freelance designer",
  },
  {
    text: "QuickBooks sync means zero double-entry. Sequences stop the second the invoice is paid.",
    name: "Boutique studio owner",
  },
  {
    text: "Preview once, flip on autopilot. Days-to-pay dropped without sounding like a collections agency.",
    name: "Marketing consultant",
  },
] as const;

export function AuthMarketingPanel() {
  return (
    <aside className="relative flex flex-col justify-between overflow-hidden bg-[#2c2825] px-8 py-10 text-[#faf8f5] lg:px-12 lg:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(224,122,95,0.35),_transparent_55%)]"
      />
      <div className="relative">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="GentleTap home">
          <Logo variant="mark" height={28} href="" className="brightness-0 invert" />
          <span className="text-xl font-bold tracking-tight text-[#faf8f5]">
            Gentle<span className="text-accent-soft">Tap</span>
          </span>
        </Link>
        <h2 className="mt-10 max-w-md text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
          Get paid faster with intelligent invoice follow-ups
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[#faf8f5]/80 lg:text-base">
          GentleTap drafts personalized reminders from your Gmail, syncs QuickBooks Online and
          FreshBooks, and stops the moment an invoice is paid.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
              <p className="text-lg font-bold text-accent-soft">{s.value}</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#faf8f5]/65">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-10 space-y-4">
        {QUOTES.map((q) => (
          <blockquote
            key={q.name}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
          >
            <p className="text-sm leading-relaxed text-[#faf8f5]/90">&ldquo;{q.text}&rdquo;</p>
            <footer className="mt-2 text-xs text-[#faf8f5]/55">{q.name}</footer>
          </blockquote>
        ))}
        <p className="pt-2 text-xs text-[#faf8f5]/50">
          Free plan forever · No credit card · Cancel anytime
        </p>
      </div>
    </aside>
  );
}

export function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "signup";
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-[48%] lg:shrink-0">
        <AuthMarketingPanel />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center lg:hidden">
            <Logo height={28} />
          </div>

          <div className="mb-6 grid grid-cols-2 rounded-full border border-border bg-card p-1">
            <Link
              href="/signup"
              className={`rounded-full px-3 py-2 text-center text-sm font-medium transition ${
                mode === "signup" ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              Get started free
            </Link>
            <Link
              href="/login"
              className={`rounded-full px-3 py-2 text-center text-sm font-medium transition ${
                mode === "login" ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              Sign in
            </Link>
          </div>

          <div className="card">{children}</div>
        </div>
      </div>
    </div>
  );
}
