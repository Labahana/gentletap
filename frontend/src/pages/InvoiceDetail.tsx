import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Pause,
  Play,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { StatusBadge } from '@/components/StatusBadge';
import { SendPreviewModal } from '@/components/SendPreviewModal';
import { ReminderTimeline } from '@/components/ReminderTimeline';
import type { ReminderRow } from '@/components/ReminderTimeline';
import { ClientProfileCard } from '@/components/ClientProfileCard';
import { TONE_LABELS, TONE_OPTIONS, describeDayOffset } from '@/lib/autopilot';
import { AUTOPILOT_STATUS_KEY } from '@/hooks/useAutopilotStatus';

function toLocalInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const InvoiceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ReminderRow | null>(null);
  const [stepTone, setStepTone] = useState('warm');
  const [stepWhen, setStepWhen] = useState('');
  const [stepTemplate, setStepTemplate] = useState('');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoiceDetail', id],
    queryFn: async () => (await api.get(`/invoices/${id}`)).data,
    enabled: !!id,
  });

  const { data: schedule } = useQuery({
    queryKey: ['invoiceSchedule', id],
    queryFn: async () => (await api.get(`/invoices/${id}/schedule`)).data,
    enabled: !!id,
  });

  const { data: profile } = useQuery({
    queryKey: ['clientProfile', invoice?.client_id],
    queryFn: async () => (await api.get(`/clients/${invoice.client_id}/profile`)).data,
    enabled: !!invoice?.client_id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['templatesDropdown'],
    queryFn: async () => (await api.get('/templates')).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoiceDetail', id] });
    queryClient.invalidateQueries({ queryKey: ['invoiceSchedule', id] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
    queryClient.invalidateQueries({ queryKey: AUTOPILOT_STATUS_KEY });
  };

  const markPaidMutation = useMutation({
    mutationFn: async () => api.post(`/invoices/${id}/mark-paid`),
    onSuccess: invalidate,
  });

  const pauseMutation = useMutation({
    mutationFn: async () => api.post(`/invoices/${id}/pause`),
    onSuccess: invalidate,
  });

  const resumeMutation = useMutation({
    mutationFn: async () => api.post(`/invoices/${id}/resume`),
    onSuccess: invalidate,
  });

  const sendNowMutation = useMutation({
    mutationFn: async () => api.post(`/invoices/${id}/send-now`),
    onSuccess: invalidate,
  });

  const regenMutation = useMutation({
    mutationFn: async () => api.post(`/invoices/${id}/regenerate-draft`),
    onSuccess: invalidate,
  });

  const disputeMutation = useMutation({
    mutationFn: async () => api.post(`/invoices/${id}/mark-disputed`),
    onSuccess: invalidate,
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ scheduleId, body }: { scheduleId: string; body: Record<string, unknown> }) =>
      api.patch(`/invoices/${id}/schedule/${scheduleId}`, body),
    onSuccess: () => {
      setEditingStep(null);
      invalidate();
    },
  });

  const openStepEditor = (item: ReminderRow) => {
    setEditingStep(item);
    setStepTone(item.tone);
    setStepWhen(toLocalInput(item.scheduled_at));
    setStepTemplate('');
  };

  const submitStepEdit = () => {
    if (!editingStep) return;
    const body: Record<string, unknown> = {};
    if (stepTone && stepTone !== editingStep.tone) body.tone = stepTone;
    if (stepWhen && new Date(stepWhen).getTime() !== new Date(editingStep.scheduled_at).getTime()) {
      body.scheduled_at = new Date(stepWhen).toISOString();
    }
    if (stepTemplate) body.template_id = stepTemplate;
    if (Object.keys(body).length === 0) {
      setEditingStep(null);
      return;
    }
    updateStepMutation.mutate({ scheduleId: editingStep.id, body });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 text-sm">Loading invoice details...</div>;
  }
  if (!invoice) {
    return <div className="p-8 text-center text-gray-500 text-sm">Invoice not found.</div>;
  }

  const active = invoice.status === 'unpaid' || invoice.status === 'chasing';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={() => navigate('/invoices')}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>
        <div className="flex items-center flex-wrap gap-2">
          {active && (
            <>
              <button
                onClick={() => sendNowMutation.mutate()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Send Now
              </button>
              <button
                onClick={() => setSendModalOpen(true)}
                className="border border-gray-200 bg-white text-gray-700 font-medium px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Manual Send
              </button>
              {invoice.stop_reminders ? (
                <button
                  onClick={() => resumeMutation.mutate()}
                  className="border border-gray-200 bg-white text-gray-700 font-medium px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={() => pauseMutation.mutate()}
                  className="border border-gray-200 bg-white text-gray-700 font-medium px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  Pause
                </button>
              )}
              <button
                onClick={() => regenMutation.mutate()}
                className="border border-gray-200 bg-white text-gray-700 font-medium px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate Draft
              </button>
              <button
                onClick={() => markPaidMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Mark Paid
              </button>
              <button
                onClick={() => disputeMutation.mutate()}
                className="border border-rose-200 text-rose-700 font-medium px-3 py-2 rounded-lg text-xs flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                Mark Disputed
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Invoice</span>
          <span className="text-xl font-bold text-gray-900 font-mono">#{invoice.number}</span>
          <div className="mt-2">
            <StatusBadge status={invoice.status} />
          </div>
        </div>
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Client</span>
          <div className="text-base font-semibold text-gray-900">{invoice.client?.name}</div>
          <div className="text-xs text-gray-500">{invoice.client?.email || 'No email'}</div>
        </div>
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Amount</span>
          <div className="text-xl font-extrabold text-gray-900">
            ${Number(invoice.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Balance: ${Number(invoice.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Due Date</span>
          <div className="text-base font-semibold text-gray-900">{invoice.due_date || 'N/A'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClientProfileCard
          score={profile?.reliability_score ?? 100}
          avgDaysToPay={profile?.avg_days_to_pay ?? 0}
          lateCount={profile?.late_count ?? 0}
          totalPaid={profile?.total_paid ?? 0}
          totalInvoices={profile?.total_invoices ?? 0}
        />
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Reminder Timeline</h3>
          <p className="text-xs text-gray-500 mb-4">
            What Autopilot has sent and what it will send next. Editing a step only affects reminders that have not gone out.
          </p>
          <ReminderTimeline items={schedule?.items || []} onEdit={openStepEditor} />
        </div>
      </div>

      {editingStep && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">Edit step {editingStep.step_index + 1}</h3>
            <p className="text-xs text-gray-500 mt-1">
              This changes when and how Autopilot sends this one reminder. Later steps keep their own schedule.
            </p>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tone</label>
                <select
                  value={stepTone}
                  onChange={(event) => setStepTone(event.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {TONE_OPTIONS.map((tone) => (
                    <option key={tone} value={tone}>
                      {TONE_LABELS[tone]}
                    </option>
                  ))}
                </select>
                {stepTone !== editingStep.tone && (
                  <p className="text-[11px] text-amber-600 mt-1">The prepared draft will be rewritten in this tone.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Send at</label>
                <input
                  type="datetime-local"
                  value={stepWhen}
                  onChange={(event) => setStepWhen(event.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {invoice.due_date && stepWhen && (
                  <p className="text-[11px] text-gray-500 mt-1">
                    {describeDayOffset(
                      Math.round(
                        (new Date(stepWhen).getTime() - new Date(`${invoice.due_date}T00:00:00`).getTime()) / 86_400_000,
                      ),
                    )}{' '}
                    (due {invoice.due_date})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Template (optional)</label>
                <select
                  value={stepTemplate}
                  onChange={(event) => setStepTemplate(event.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">Keep the current tone template</option>
                  {templates.map((template: any) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              {updateStepMutation.error && (
                <p className="text-xs text-rose-700">
                  {apiErrorMessage(updateStepMutation.error, 'Could not update this step.')}
                </p>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setEditingStep(null)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={submitStepEdit}
                  disabled={updateStepMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-xs shadow-xs disabled:opacity-50"
                >
                  {updateStepMutation.isPending ? 'Saving…' : 'Save step'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sendModalOpen && (
        <SendPreviewModal
          isOpen={sendModalOpen}
          invoice={invoice}
          templates={templates}
          onClose={() => setSendModalOpen(false)}
          onSuccess={() => {
            setSendModalOpen(false);
            invalidate();
          }}
        />
      )}
    </div>
  );
};
