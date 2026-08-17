import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { EscalationRow, Escalation } from '@/components/EscalationRow';

export const Escalations: React.FC = () => {
  const [minDays, setMinDays] = useState(30);
  const [highValue, setHighValue] = useState(false);
  const queryClient = useQueryClient();

  const { data: escalations = [], isLoading } = useQuery({
    queryKey: ['escalations', minDays, highValue],
    queryFn: async () =>
      (
        await api.get('/dashboard/escalations', {
          params: { min_days: minDays, high_value: highValue },
        })
      ).data,
  });

  const sendNow = useMutation({
    mutationFn: async (invoiceId: string) => api.post(`/invoices/${invoiceId}/send-now`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalations'] }),
  });

  const pause = useMutation({
    mutationFn: async (invoiceId: string) => api.post(`/invoices/${invoiceId}/pause`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalations'] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Escalations</h1>
        <p className="text-sm text-gray-500 mt-1">At-risk invoices and recommended next actions</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {[30, 60].map((d) => (
          <button
            key={d}
            onClick={() => setMinDays(d)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
              minDays === d ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
            }`}
          >
            {d}+ days
          </button>
        ))}
        <button
          onClick={() => setHighValue(!highValue)}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
            highValue ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200'
          }`}
        >
          High value (&gt;$1,000)
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-3 px-3">Invoice</th>
              <th className="py-3 px-3">Client</th>
              <th className="py-3 px-3">Amount</th>
              <th className="py-3 px-3">Days Overdue</th>
              <th className="py-3 px-3">Reminders</th>
              <th className="py-3 px-3">Recommended</th>
              <th className="py-3 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {(escalations as Escalation[]).map((item) => (
              <EscalationRow
                key={item.invoice_id}
                item={item}
                onSendNow={(id) => sendNow.mutate(id)}
                onPause={(id) => pause.mutate(id)}
              />
            ))}
            {!isLoading && !escalations.length && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-xs text-gray-400">
                  No escalations match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
