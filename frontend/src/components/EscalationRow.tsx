import React from 'react';
import { Link } from 'react-router-dom';
import { Send, Pause, Eye } from 'lucide-react';

export type Escalation = {
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  days_overdue: number;
  reminders_sent: number;
  recommended_action: string;
};

interface Props {
  item: Escalation;
  onSendNow?: (invoiceId: string) => void;
  onPause?: (invoiceId: string) => void;
}

export const EscalationRow: React.FC<Props> = ({ item, onSendNow, onPause }) => {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/80">
      <td className="py-3 px-3 text-sm font-mono font-semibold text-blue-600">#{item.invoice_number}</td>
      <td className="py-3 px-3 text-sm text-gray-900">{item.client_name}</td>
      <td className="py-3 px-3 text-sm font-semibold text-gray-900">
        ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </td>
      <td className="py-3 px-3 text-sm text-rose-600 font-medium">{item.days_overdue}d</td>
      <td className="py-3 px-3 text-sm text-gray-600">{item.reminders_sent}</td>
      <td className="py-3 px-3 text-xs text-gray-700">{item.recommended_action}</td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <Link
            to={`/invoices/${item.invoice_id}`}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
            title="View"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
          {onSendNow && (
            <button
              onClick={() => onSendNow(item.invoice_id)}
              className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50"
              title="Send now"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          {onPause && (
            <button
              onClick={() => onPause(item.invoice_id)}
              className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50"
              title="Pause"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
