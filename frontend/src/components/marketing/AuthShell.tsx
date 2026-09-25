import React from 'react';
import { Link } from 'react-router-dom';

const STATS = [
  { value: '5 free', label: 'Collections / month' },
  { value: 'QB + FB', label: 'Accounting sync' },
  { value: 'Auto-stop', label: 'The moment you’re paid' },
] as const;

const QUOTES = [
  {
    text: 'I stopped writing awkward chase emails. GentleTap drafts them in my voice and sends from my Gmail.',
    name: 'Freelance designer',
  },
  {
    text: 'QuickBooks sync means zero double-entry. Sequences stop the second the invoice is paid.',
    name: 'Boutique studio owner',
  },
  {
    text: 'Preview once, flip on autopilot. Days-to-pay dropped without sounding like a collections agency.',
    name: 'Marketing consultant',
  },
] as const;

const AuthMarketingPanel: React.FC = () => (
  <aside className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 px-8 py-10 text-slate-50 lg:flex lg:w-[48%] lg:shrink-0 lg:px-12 lg:py-14">
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(37,99,235,0.35),transparent_55%)]"
    />
    <div className="relative">
      <Link to="/" className="inline-flex items-center gap-2.5" aria-label="GentleTap home">
        <div className="h-7 w-7 overflow-hidden rounded-lg">
          <img src="/logo192.png" alt="" className="h-full w-full object-contain brightness-0 invert" />
        </div>
        <span className="text-xl font-bold tracking-tight text-slate-50">
          Gentle<span className="text-brand-300">Tap</span>
        </span>
      </Link>
      <h2 className="mt-10 max-w-md text-3xl font-bold leading-tight tracking-tight lg:text-4xl">
        Get paid faster with intelligent invoice follow-ups
      </h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-50/80 lg:text-base">
        GentleTap drafts personalized reminders from your Gmail, syncs QuickBooks Online and
        FreshBooks, and stops the moment an invoice is paid.
      </p>

      <div className="mt-8 grid grid-cols-3 gap-3">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <p className="text-lg font-bold text-brand-300">{s.value}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-50/65">{s.label}</p>
          </div>
        ))}
      </div>
    </div>

    <div className="relative mt-10 space-y-4">
      {QUOTES.map((q) => (
        <blockquote key={q.name} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <p className="text-sm leading-relaxed text-slate-50/90">&ldquo;{q.text}&rdquo;</p>
          <footer className="mt-2 text-xs text-slate-50/55">{q.name}</footer>
        </blockquote>
      ))}
      <p className="pt-2 text-xs text-slate-50/50">Free plan forever · No credit card · Cancel anytime</p>
    </div>
  </aside>
);

export const AuthShell: React.FC<{
  mode: 'login' | 'signup' | 'recover';
  children: React.ReactNode;
}> = ({ mode, children }) => (
  <div className="flex min-h-screen flex-1 flex-col bg-slate-50 font-display lg:flex-row">
    <AuthMarketingPanel />

    <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center lg:hidden">
          <Link to="/" className="flex items-center gap-2.5" aria-label="GentleTap home">
            <div className="h-8 w-8 overflow-hidden rounded-lg">
              <img src="/logo192.png" alt="GentleTap" className="h-full w-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Gentle<span className="text-brand-600">Tap</span>
            </span>
          </Link>
        </div>

        {mode !== 'recover' && (
          <div className="mb-6 grid grid-cols-2 rounded-full border border-slate-200 bg-white p-1">
            <Link
              to="/signup"
              className={`rounded-full px-3 py-2 text-center text-sm font-medium transition ${
                mode === 'signup' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Get started free
            </Link>
            <Link
              to="/login"
              className={`rounded-full px-3 py-2 text-center text-sm font-medium transition ${
                mode === 'login' ? 'bg-brand-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign in
            </Link>
          </div>
        )}

        <div className="mkt-card">{children}</div>
      </div>
    </div>
  </div>
);

export const GoogleButton: React.FC<{ onClick: () => void; loading: boolean; label: string }> = ({
  onClick,
  loading,
  label,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading}
    className="flex w-full items-center justify-center space-x-2 rounded-full border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
  >
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
    <span>{loading ? 'Connecting…' : label}</span>
  </button>
);

export const Divider: React.FC = () => (
  <div className="relative my-4 flex items-center justify-center">
    <div className="w-full border-t border-slate-200" />
    <span className="absolute bg-white px-3 text-xs font-medium text-slate-600">OR</span>
  </div>
);
