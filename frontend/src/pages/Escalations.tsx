import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { EscalationRow, Escalation } from '@/components/EscalationRow';

interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: { min_days_overdue?: number; min_reminders_sent?: number; min_amount?: number };
  actions: { notify_email?: boolean; pause_reminders?: boolean; mark_escalated?: boolean };
  position: number;
}

const RuleForm: React.FC<{
  onCreated: () => void;
}> = ({ onCreated }) => {
  const [name, setName] = useState('');
  const [days, setDays] = useState(30);
  const [reminders, setReminders] = useState(3);
  const [amount, setAmount] = useState(0);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [pauseReminders, setPauseReminders] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/escalation-rules', {
        name,
        enabled: true,
        conditions: { min_days_overdue: days, min_reminders_sent: reminders, min_amount: amount || undefined },
        actions: { notify_email: notifyEmail, pause_reminders: pauseReminders, mark_escalated: true },
        position: 0,
      });
      setName('');
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="Rule name (e.g. 60+ days — notify me)"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
      />
      <div className="grid grid-cols-3 gap-2">
        <label className="text-xs text-gray-500">
          Days overdue ≥
          <input
            type="number"
            min={0}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Reminders sent ≥
          <input
            type="number"
            min={0}
            value={reminders}
            onChange={(e) => setReminders(Number(e.target.value))}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </label>
        <label className="text-xs text-gray-500">
          Min amount ($)
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} />
          Email me
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={pauseReminders} onChange={(e) => setPauseReminders(e.target.checked)} />
          Pause further reminders
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Add rule'}
      </button>
    </form>
  );
};

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

  const { data: rulesData } = useQuery({
    queryKey: ['escalation-rules'],
    queryFn: async () => (await api.get('/escalation-rules')).data,
  });
  const rules: Rule[] = rulesData?.items ?? [];

  const deleteRule = useMutation({
    mutationFn: async (id: string) => api.delete(`/escalation-rules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['escalation-rules'] }),
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

      {/* Escalation rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" /> Escalation rules
          </h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">
            Automatically notify you or pause reminders when invoices hit these thresholds.
          </p>
          <div className="space-y-2">
            {rules.length === 0 && (
              <p className="text-xs text-gray-400 py-4 text-center">No rules yet — add your first below.</p>
            )}
            {rules.map((r) => (
              <div key={r.id} className="flex items-start justify-between border border-gray-100 rounded-lg p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {r.conditions.min_days_overdue ? `${r.conditions.min_days_overdue}+ days` : ''}
                    {r.conditions.min_reminders_sent ? ` · ${r.conditions.min_reminders_sent}+ reminders` : ''}
                    {r.conditions.min_amount ? ` · $${r.conditions.min_amount}+` : ''}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[r.actions.notify_email && 'email', r.actions.pause_reminders && 'pause', r.actions.mark_escalated && 'mark']
                      .filter(Boolean)
                      .join(' · ') || 'no actions'}
                  </p>
                </div>
                <button
                  onClick={() => deleteRule.mutate(r.id)}
                  className="text-gray-300 hover:text-rose-500 p-1"
                  title="Delete rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" /> New rule
          </h2>
          <p className="text-xs text-gray-500 mt-1 mb-4">All conditions must match to trigger the rule.</p>
          <RuleForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['escalation-rules'] })} />
        </div>
      </div>
    </div>
  );
};
