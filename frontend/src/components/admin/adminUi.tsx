import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

export const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : '—');
export const fmtDateTime = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');
export const fmtMoney = (v?: number | null) => `$${Number(v ?? 0).toFixed(0)}`;

export const Badge: React.FC<{ tone?: 'green' | 'amber' | 'red' | 'blue' | 'slate'; children: React.ReactNode }> = ({
  tone = 'slate',
  children,
}) => {
  const cls = {
    green: 'bg-green-100 text-green-700',
    amber: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    slate: 'bg-slate-100 text-slate-600',
  }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
};

export const StatCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
}> = ({ label, value, sub, onClick, footer }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={!onClick}
    className={`text-left bg-white rounded-2xl border border-gray-200 p-5 ${onClick ? 'hover:border-blue-300 cursor-pointer' : 'cursor-default'}`}
  >
    <p className="text-2xl font-extrabold text-gray-900">{value}</p>
    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    {footer}
  </button>
);

export const Section: React.FC<{ title: string; actions?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  actions,
  children,
}) => (
  <section className="bg-white border border-gray-200 rounded-2xl p-5">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {actions}
    </div>
    {children}
  </section>
);

export const Spinner = () => <Loader2 size={16} className="animate-spin inline-block text-gray-400" />;

export const Pagination: React.FC<{
  total: number;
  limit: number;
  offset: number;
  onOffset: (o: number) => void;
}> = ({ total, limit, offset, onOffset }) => (
  <div className="flex items-center justify-between pt-3 text-xs text-gray-500">
    <span>
      {total === 0 ? 'No results' : `${Math.min(offset + 1, total)}–${Math.min(offset + limit, total)} of ${total}`}
    </span>
    <div className="flex gap-2">
      <button
        disabled={offset <= 0}
        onClick={() => onOffset(Math.max(0, offset - limit))}
        className="border border-gray-300 rounded-lg px-3 py-1 disabled:opacity-40 hover:border-blue-400"
      >
        Prev
      </button>
      <button
        disabled={offset + limit >= total}
        onClick={() => onOffset(offset + limit)}
        className="border border-gray-300 rounded-lg px-3 py-1 disabled:opacity-40 hover:border-blue-400"
      >
        Next
      </button>
    </div>
  </div>
);

export const ConfirmButton: React.FC<{
  onConfirm: () => void | Promise<void>;
  onError?: (message: string) => void;
  label: string;
  confirmLabel?: string;
  tone?: 'blue' | 'red' | 'green' | 'gray';
  disabled?: boolean;
  busy?: boolean;
}> = ({ onConfirm, onError, label, confirmLabel = 'Confirm?', tone = 'gray', disabled, busy }) => {
  const [armed, setArmed] = useState(false);
  const cls = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    green: 'bg-green-600 hover:bg-green-700 text-white',
    red: 'border border-red-200 text-red-600 hover:bg-red-50',
    gray: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  }[tone];
  if (!armed) {
    return (
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => setArmed(true)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1 disabled:opacity-50 ${cls}`}
      >
        {busy && <Loader2 size={12} className="animate-spin" />}
        {label}
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          try {
            await onConfirm();
          } catch (err) {
            onError?.(err instanceof Error ? err.message : 'Action failed');
          }
          setArmed(false);
        }}
        className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
      >
        {confirmLabel}
      </button>
      <button type="button" onClick={() => setArmed(false)} className="text-xs text-gray-500 hover:text-gray-700 px-1">
        Cancel
      </button>
    </span>
  );
};

export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, wide }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-8 bg-gray-900/40" onClick={onClose}>
    <div
      className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} max-h-full overflow-y-auto`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1">
          ✕
        </button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export const Sparkline: React.FC<{ data: number[]; color?: string }> = ({ data, color = '#2563eb' }) => {
  const w = 120;
  const h = 32;
  if (data.length === 0) return null;
  const max = Math.max(...data, 1);
  const step = w / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => `${(i * step).toFixed(1)},${(h - (v / max) * (h - 4) - 2).toFixed(1)}`).join(' ');
  return (
    <svg width={w} height={h} className="mt-2 overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  );
};
