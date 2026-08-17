import React from 'react';

interface DigestPreviewProps {
  digest?: {
    date?: string;
    payments_received?: number;
    payments_amount?: number;
    reminders_sent?: number;
    opens?: number;
    clicks?: number;
    escalations?: number;
  } | null;
}

export const DigestPreview: React.FC<DigestPreviewProps> = ({ digest }) => {
  const d = digest || {
    date: 'Yesterday',
    payments_received: 0,
    payments_amount: 0,
    reminders_sent: 0,
    opens: 0,
    clicks: 0,
    escalations: 0,
  };

  return (
    <div className="bg-slate-50 border border-gray-200 rounded-xl p-5 text-sm">
      <div className="font-bold text-gray-900 mb-2">Daily digest preview</div>
      <p className="text-xs text-gray-500 mb-3">{d.date}</p>
      <ul className="space-y-1.5 text-xs text-gray-700">
        <li>
          Payments received: {d.payments_received} (${(d.payments_amount || 0).toLocaleString()})
        </li>
        <li>Reminders sent: {d.reminders_sent}</li>
        <li>
          Opens / clicks: {d.opens} / {d.clicks}
        </li>
        <li>Escalations: {d.escalations}</li>
      </ul>
    </div>
  );
};
