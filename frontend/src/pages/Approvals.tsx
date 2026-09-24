import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, ShieldCheck, X } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { AUTOPILOT_STATUS_KEY } from '@/hooks/useAutopilotStatus';
import { TONE_LABELS, describeHold } from '@/lib/autopilot';

interface ApprovalItem {
  id: string;
  invoice_id: string;
  step_index: number;
  tone: string;
  scheduled_at: string;
  draft_subject: string | null;
  draft_body: string | null;
  skip_reason: string | null;
  created_at: string;
  invoice_number: string | null;
  amount: number | null;
  currency: string | null;
  due_date: string | null;
  client_name: string | null;
  client_email: string | null;
}

export const Approvals: React.FC = () => {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data: approvals = [], isLoading, error } = useQuery<ApprovalItem[]>({
    queryKey: ['approvals'],
    queryFn: async () => (await api.get('/approval-queue')).data,
    refetchInterval: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['approvals'] });
    queryClient.invalidateQueries({ queryKey: AUTOPILOT_STATUS_KEY });
  };

  const approve = useMutation({
    mutationFn: async ({ item, draftSubject, draftBody }: { item: ApprovalItem; draftSubject: string; draftBody: string }) => {
      const response = await api.post(`/approval-queue/${item.id}/approve`, {
        subject: draftSubject === (item.draft_subject || '') ? undefined : draftSubject,
        body: draftBody === (item.draft_body || '') ? undefined : draftBody,
      });
      return response.data;
    },
    onSuccess: () => {
      setExpandedId(null);
      invalidate();
    },
  });

  const reject = useMutation({
    mutationFn: async (id: string) => (await api.post(`/approval-queue/${id}/reject`)).data,
    onSuccess: () => {
      setExpandedId(null);
      invalidate();
    },
  });

  const openItem = (item: ApprovalItem) => {
    if (expandedId === item.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(item.id);
    setSubject(item.draft_subject || '');
    setBody(item.draft_body || '');
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link
          to="/autopilot"
          className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Autopilot
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Approval Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          Reminders your autonomy settings held before sending. Approving schedules them for the next valid send window.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {apiErrorMessage(error, 'Unable to load the approval queue.')}
        </div>
      )}

      <div className="space-y-3">
        {isLoading && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
            Loading approval queue…
          </div>
        )}
        {!isLoading && approvals.length === 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-emerald-500" />
            <p className="mt-3 text-sm font-semibold text-gray-800">Nothing needs review</p>
            <p className="mt-1 text-xs text-gray-500">New approval-gated reminders will appear here with their prepared drafts.</p>
          </div>
        )}
        {approvals.map((item) => {
          const expanded = expandedId === item.id;
          const pending = approve.isPending || reject.isPending;
          return (
            <div key={item.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
              <button
                type="button"
                onClick={() => openItem(item)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{item.invoice_number || 'Invoice'}</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      {TONE_LABELS[item.tone] || item.tone} · step {item.step_index + 1}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {item.client_name || item.client_email || 'Unknown client'}
                    {item.amount != null && ` · ${item.currency || 'USD'} ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  </p>
                </div>
                {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-gray-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />}
              </button>

              {expanded && (
                <div className="space-y-4 border-t border-gray-100 p-4">
                  <p className="text-xs text-gray-500">
                    {describeHold(item.skip_reason) || 'Held by your autonomy settings'} — approve to send it at the next
                    valid window, or reject to cancel this step.
                  </p>
                  <label className="block text-xs font-semibold text-gray-700">
                    Subject
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-gray-700">
                    Draft message
                    <textarea
                      rows={7}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </label>
                  {(approve.error || reject.error) && (
                    <p className="text-xs text-rose-700">
                      {apiErrorMessage(approve.error || reject.error, 'Could not update this reminder.')}
                    </p>
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => reject.mutate(item.id)}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => approve.mutate({ item, draftSubject: subject, draftBody: body })}
                      disabled={pending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {approve.isPending ? 'Approving…' : 'Approve & schedule'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
