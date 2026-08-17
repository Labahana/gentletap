import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = (status || '').toLowerCase();

  let style = 'bg-gray-100 text-gray-700 border-gray-200';
  let label = status;

  switch (normalized) {
    case 'unpaid':
      style = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Unpaid';
      break;
    case 'paid':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Paid';
      break;
    case 'disputed':
      style = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'Disputed';
      break;
    case 'closed':
      style = 'bg-slate-100 text-slate-700 border-slate-200';
      label = 'Closed';
      break;
    case 'sent':
      style = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Sent';
      break;
    case 'delivered':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Delivered';
      break;
    case 'opened':
      style = 'bg-purple-50 text-purple-700 border-purple-200';
      label = 'Opened';
      break;
    case 'failed':
      style = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'Failed';
      break;
    case 'bounced':
      style = 'bg-orange-50 text-orange-700 border-orange-200';
      label = 'Bounced';
      break;
    case 'active':
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      label = 'Active';
      break;
    case 'paused':
      style = 'bg-amber-50 text-amber-700 border-amber-200';
      label = 'Paused';
      break;
    case 'completed':
      style = 'bg-blue-50 text-blue-700 border-blue-200';
      label = 'Completed';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {label}
    </span>
  );
};
