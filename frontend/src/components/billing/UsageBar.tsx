import React from 'react';

interface Props {
  label: string;
  used: number;
  quota: number;
  suffix?: string;
}

export const UsageBar: React.FC<Props> = ({ label, used, quota, suffix = '' }) => {
  const unlimited = quota >= 999999;
  const pct = unlimited ? Math.min(100, used > 0 ? 10 : 0) : Math.min(100, (used / Math.max(quota, 1)) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-semibold text-gray-700">{label}</span>
        <span className="text-gray-500">
          {used}
          {unlimited ? '' : ` / ${quota}`}
          {suffix}
          {unlimited ? ' (unlimited)' : ''}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
