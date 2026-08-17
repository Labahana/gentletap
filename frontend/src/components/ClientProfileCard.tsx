import React from 'react';

interface Props {
  score: number;
  avgDaysToPay?: number;
  lateCount?: number;
  totalPaid?: number;
  totalInvoices?: number;
}

export const ClientProfileCard: React.FC<Props> = ({
  score,
  avgDaysToPay = 0,
  lateCount = 0,
  totalPaid = 0,
  totalInvoices = 0,
}) => {
  const color = score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#e11d48';
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (Math.min(100, Math.max(0, score)) / 100) * circ;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Client Reliability</h3>
      <div className="flex items-center gap-5">
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
            <circle cx="44" cy="44" r={radius} stroke="#e5e7eb" strokeWidth="8" fill="none" />
            <circle
              cx="44"
              cy="44"
              r={radius}
              stroke={color}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-900">{score}</span>
          </div>
        </div>
        <div className="space-y-1.5 text-xs text-gray-600">
          <div>
            Avg days to pay: <strong className="text-gray-900">{avgDaysToPay.toFixed(1)}</strong>
          </div>
          <div>
            Late payments: <strong className="text-gray-900">{lateCount}</strong>
          </div>
          <div>
            Paid / total: <strong className="text-gray-900">{totalPaid}/{totalInvoices}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
