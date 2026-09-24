import React from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Bot, Play, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAutopilotStatus, AUTOPILOT_STATUS_KEY } from '@/hooks/useAutopilotStatus';
import { TONE_LABELS, timeAgo, timeUntil } from '@/lib/autopilot';

/**
 * Dashboard hero: one glance tells the user whether autopilot is running,
 * what it just did, and what it will do next.
 */
export const AutopilotBar: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useAutopilotStatus();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: AUTOPILOT_STATUS_KEY });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  };

  const enable = useMutation({
    mutationFn: async () => (await api.post('/autopilot/enable')).data,
    onSuccess: invalidate,
  });
  const resume = useMutation({
    mutationFn: async () => (await api.post('/settings/resume-all')).data,
    onSuccess: invalidate,
  });

  if (isLoading || !data) {
    return <div className="h-28 rounded-xl border border-gray-200 bg-gray-50 animate-pulse" />;
  }

  const nextStep = data.next_send;

  if (!data.active) {
    const off = data.mode !== 'autopilot';
    return (
      <div className="border border-gray-200 bg-white rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">
              {off ? 'Autopilot is off' : 'Autopilot is paused'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {off
                ? 'Turn it on and GentleTap chases overdue invoices on its own.'
                : data.pause_reason || 'Nothing will send until you resume.'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {off ? (
            <button
              onClick={() => enable.mutate()}
              disabled={enable.isPending}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg"
            >
              <Play className="w-3.5 h-3.5" />
              {enable.isPending ? 'Starting…' : 'Turn on Autopilot'}
            </button>
          ) : (
            <button
              onClick={() => resume.mutate()}
              disabled={resume.isPending}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg"
            >
              <Play className="w-3.5 h-3.5" />
              {resume.isPending ? 'Resuming…' : 'Resume now'}
            </button>
          )}
          <Link
            to="/autopilot"
            className="text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 px-3.5 py-2 rounded-lg"
          >
            Autopilot settings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-emerald-900">GentleTap is handling everything</div>
            <div className="text-xs text-emerald-800/80 mt-1">
              {data.active_sequences} active sequence{data.active_sequences === 1 ? '' : 's'} ·{' '}
              {data.sent_today} sent today · {data.scheduled_reminders} scheduled
            </div>
            {data.last_action && (
              <div className="text-[11px] text-emerald-800/70 mt-1.5">
                Last action: {data.last_action.title} · {timeAgo(data.last_action.timestamp)}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.pending_approvals > 0 && (
            <Link
              to="/approvals"
              className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-emerald-50"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              {data.pending_approvals} to review
            </Link>
          )}
          <Link
            to="/autopilot"
            className="inline-flex items-center gap-1.5 bg-white border border-emerald-300 text-emerald-800 text-xs font-semibold px-3.5 py-2 rounded-lg hover:bg-emerald-50"
          >
            Autopilot settings <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {nextStep && (
        <div className="mt-3.5 pt-3.5 border-t border-emerald-200/70 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-emerald-900/80">
          <span className="font-semibold uppercase tracking-wide text-emerald-800/60">Next up</span>
          <span>
            {TONE_LABELS[nextStep.tone] || nextStep.tone} reminder to{' '}
            {nextStep.client_name || 'client'}
            {nextStep.invoice_number ? ` · Invoice #${nextStep.invoice_number}` : ''}
          </span>
          <span className="text-emerald-800/60">
            {timeUntil(nextStep.scheduled_at)} · step {nextStep.step_index + 1}
          </span>
        </div>
      )}
    </div>
  );
};
