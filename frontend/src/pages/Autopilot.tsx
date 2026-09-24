import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Pause,
  Play,
  Plus,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
  Mail,
  MessageSquare,
  Clock,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAutopilotStatus, AUTOPILOT_STATUS_KEY } from '@/hooks/useAutopilotStatus';
import {
  DAY_LABELS,
  STEP_TONE_OVERRIDES,
  describeDayOffset,
  timeAgo,
  timeUntil,
  type SequenceStep,
} from '@/lib/autopilot';

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20';
const cardCls = 'bg-white border border-gray-200 rounded-xl p-6 shadow-xs';
const labelCls = 'block text-xs font-semibold text-gray-700 mb-1';

interface EscalationRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: Record<string, unknown>;
  actions: Record<string, unknown>;
  position: number;
}

/* ------------------------------------------------------------------ hero */

const AutopilotHero: React.FC<{ onOpenSettings: () => void }> = ({ onOpenSettings }) => {
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
  const disable = useMutation({
    mutationFn: async () => (await api.post('/autopilot/disable')).data,
    onSuccess: invalidate,
  });
  const resume = useMutation({
    mutationFn: async () => (await api.post('/settings/resume-all')).data,
    onSuccess: invalidate,
  });

  if (isLoading || !data) {
    return <div className={`${cardCls} h-32 animate-pulse bg-gray-50`} />;
  }

  if (!data.active) {
    const off = data.mode !== 'autopilot';
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {off ? 'Autopilot is off' : 'Autopilot is paused'}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5 max-w-xl">
                {off
                  ? 'Turn it on and GentleTap will chase every overdue invoice for you — picking the tone, timing and follow-up cadence on its own.'
                  : data.pause_reason
                    ? `Paused: ${data.pause_reason}. Nothing will send until you resume.`
                    : 'Nothing will send until you resume.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {off ? (
              <button
                onClick={() => enable.mutate()}
                disabled={enable.isPending}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                <Play className="w-4 h-4" />
                {enable.isPending ? 'Starting…' : 'Turn on Autopilot'}
              </button>
            ) : (
              <button
                onClick={() => resume.mutate()}
                disabled={resume.isPending}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              >
                <Play className="w-4 h-4" />
                {resume.isPending ? 'Resuming…' : 'Resume now'}
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 px-4 py-2 rounded-lg"
            >
              Tune it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/60 border border-emerald-200 rounded-xl p-6 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-900">GentleTap is handling everything</h2>
            <p className="text-sm text-emerald-800/80 mt-0.5">
              {data.active_sequences > 0
                ? `${data.active_sequences} active sequence${data.active_sequences === 1 ? '' : 's'} running${
                    data.next_send ? ` · next follow-up ${timeUntil(data.next_send.scheduled_at)}` : ''
                  }`
                : 'No active sequences yet — overdue invoices will be picked up on the next sync.'}
            </p>
            {data.last_action && (
              <p className="text-xs text-emerald-800/70 mt-2">
                Last action: {data.last_action.title} · {timeAgo(data.last_action.timestamp)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.pending_approvals > 0 && (
            <Link
              to="/approvals"
              className="inline-flex items-center gap-2 bg-white border border-emerald-300 text-emerald-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {data.pending_approvals} to review
            </Link>
          )}
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 bg-white border border-emerald-300 text-emerald-800 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-emerald-50"
          >
            Tune it <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => disable.mutate()}
            disabled={disable.isPending}
            className="text-sm font-medium text-emerald-800/70 hover:text-emerald-900 px-3 py-2"
          >
            Pause
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[
          { label: 'Sent today', value: data.sent_today },
          { label: 'Scheduled', value: data.scheduled_reminders },
          { label: 'Active sequences', value: data.active_sequences },
          { label: 'Sources synced', value: data.connected_sources },
        ].map((tile) => (
          <div key={tile.label} className="bg-white/70 border border-emerald-200 rounded-lg px-3 py-2.5">
            <div className="text-lg font-bold text-emerald-900">{tile.value}</div>
            <div className="text-[11px] font-medium text-emerald-800/70">{tile.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------ run state */

const RunStateSection: React.FC = () => {
  const queryClient = useQueryClient();
  const { data } = useAutopilotStatus();
  const [pauseUntil, setPauseUntil] = useState('');
  const [pauseReason, setPauseReason] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: AUTOPILOT_STATUS_KEY });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
  };

  const pauseAll = useMutation({
    mutationFn: async () =>
      (
        await api.post('/settings/pause-all', {
          until: pauseUntil ? new Date(pauseUntil).toISOString() : null,
          reason: pauseReason || null,
        })
      ).data,
    onSuccess: () => {
      setPauseUntil('');
      setPauseReason('');
      invalidate();
    },
  });

  const resumeAll = useMutation({
    mutationFn: async () => (await api.post('/settings/resume-all')).data,
    onSuccess: invalidate,
  });

  return (
    <section className={cardCls}>
      <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Run state</h3>
      <p className="text-xs text-gray-500 mt-3">
        Pausing stops every sequence immediately. Reminders resume automatically when the pause
        window ends.
      </p>

      {data?.paused ? (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="font-semibold">All reminders are paused.</span>
            {data.pause_until && <span> Resumes {new Date(data.pause_until).toLocaleString()}.</span>}
            {data.pause_reason && <span className="block mt-0.5">Reason: {data.pause_reason}</span>}
          </div>
          <button
            onClick={() => resumeAll.mutate()}
            disabled={resumeAll.isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
          >
            {resumeAll.isPending ? 'Resuming…' : 'Resume all'}
          </button>
        </div>
      ) : (
        <div className="mt-4 border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={pauseUntil}
              onChange={(e) => setPauseUntil(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs"
            />
            <input
              type="text"
              placeholder="Reason (optional)"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs flex-1 min-w-40"
            />
            <button
              onClick={() => pauseAll.mutate()}
              disabled={pauseAll.isPending}
              className="inline-flex items-center gap-1.5 border border-amber-300 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-50"
            >
              <Pause className="w-3.5 h-3.5" />
              {pauseAll.isPending ? 'Pausing…' : 'Pause everything'}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Leave the date empty to pause indefinitely.
          </p>
        </div>
      )}
    </section>
  );
};

/* -------------------------------------------------------------- cadence */

const CadenceSection: React.FC = () => {
  const queryClient = useQueryClient();
  const { data } = useAutopilotStatus();
  const sequence = data?.default_sequence;
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [stopAfterDays, setStopAfterDays] = useState(30);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!sequence) return;
    setSteps((sequence.steps || []).map((s) => ({ ...s, enabled: s.enabled !== false })));
    setStopAfterDays(sequence.stop_after_days ?? 30);
    setDirty(false);
  }, [sequence?.id, sequence?.steps, sequence?.stop_after_days]);

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.patch(`/sequences/${sequence!.id}`, {
          steps,
          stop_after_days: stopAfterDays,
        })
      ).data,
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: AUTOPILOT_STATUS_KEY });
    },
  });

  const toggleAutoAssign = useMutation({
    mutationFn: async () => (await api.post(`/sequences/${sequence!.id}/auto-assign`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AUTOPILOT_STATUS_KEY }),
  });

  if (!sequence) {
    return (
      <section className={cardCls}>
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Cadence</h3>
        <p className="text-sm text-gray-500 mt-3">
          No default sequence yet. Turn on Autopilot to generate one.
        </p>
      </section>
    );
  }

  const update = (index: number, patch: Partial<SequenceStep>) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
    setDirty(true);
  };

  const sorted = useMemo(() => [...steps].sort((a, b) => a.day_offset - b.day_offset), [steps]);

  return (
    <section className={cardCls}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">Cadence</h3>
          <p className="text-xs text-gray-500 mt-1">
            When GentleTap follows up and how it sounds at each stage. Tone is the only thing you
            need to pick — the copy writes itself.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
          <input
            type="checkbox"
            checked={!!sequence.auto_assign}
            onChange={() => toggleAutoAssign.mutate()}
            className="rounded border-gray-300"
          />
          Auto-assign to new overdue invoices
        </label>
      </div>

      <div className="mt-4 space-y-2">
        {sorted.map((step, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 border border-gray-200 rounded-lg px-3 py-2"
          >
            <input
              type="checkbox"
              checked={step.enabled !== false}
              onChange={(e) => update(index, { enabled: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-xs font-semibold text-gray-500 w-10">Day</span>
            <input
              type="number"
              value={step.day_offset}
              onChange={(e) => update(index, { day_offset: Number(e.target.value) })}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-gray-500 w-28">{describeDayOffset(step.day_offset)}</span>
            <select
              value={step.tone}
              onChange={(e) => update(index, { tone: e.target.value })}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            >
              {STEP_TONE_OVERRIDES.filter((t) => t.value !== 'auto').map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <span
              className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                step.enabled === false ? 'bg-gray-100 text-gray-400' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              {step.enabled === false ? 'Off' : 'Active'}
            </span>
            <button
              onClick={() => {
                setSteps((prev) => prev.filter((_, i) => i !== index));
                setDirty(true);
              }}
              className="ml-auto p-1.5 text-gray-400 hover:text-rose-600"
              title="Remove step"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
        <button
          onClick={() => {
            const maxDay = steps.reduce((m, s) => Math.max(m, s.day_offset), 0);
            setSteps((prev) => [...prev, { day_offset: maxDay + 7, tone: 'professional', enabled: true }]);
            setDirty(true);
          }}
          className="inline-flex items-center gap-1.5 border border-gray-200 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add step
        </button>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-700 flex items-center gap-2">
            Stop chasing after
            <select
              value={stopAfterDays}
              onChange={(e) => {
                setStopAfterDays(Number(e.target.value));
                setDirty(true);
              }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
            >
              {[30, 45, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {d} days overdue
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => save.mutate()}
            disabled={!dirty || save.isPending}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-lg"
          >
            <Save className="w-3.5 h-3.5" />
            {save.isPending ? 'Saving…' : 'Save cadence'}
          </button>
        </div>
      </div>
    </section>
  );
};

/* ------------------------------------------------------------- settings */

const ControlCenterSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [minAmount, setMinAmount] = useState('');
  const [waDelay, setWaDelay] = useState(3);
  const [waQuietEnabled, setWaQuietEnabled] = useState(false);
  const [waQuietStart, setWaQuietStart] = useState(21);
  const [waQuietEnd, setWaQuietEnd] = useState(8);
  const [sendWindowDays, setSendWindowDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [suppressOnReply, setSuppressOnReply] = useState(true);
  const [contactWindow, setContactWindow] = useState(true);
  const [timezone, setTimezone] = useState('America/New_York');
  const [signature, setSignature] = useState('');
  const [approvalMode, setApprovalMode] = useState<'off' | 'first_batch' | 'amount_threshold'>('off');
  const [approvalThreshold, setApprovalThreshold] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  useEffect(() => {
    if (!settingsData) return;
    setMinAmount(settingsData.min_amount != null ? String(settingsData.min_amount) : '');
    setWaDelay(settingsData.whatsapp_delay_hours ?? 3);
    const qh = settingsData.whatsapp_quiet_hours;
    setWaQuietEnabled(!!qh);
    setWaQuietStart(qh?.start ?? 21);
    setWaQuietEnd(qh?.end ?? 8);
    setSendWindowDays(settingsData.send_window_days ?? [0, 1, 2, 3, 4, 5, 6]);
    setSkipWeekends(settingsData.skip_weekends ?? false);
    setSuppressOnReply(settingsData.suppress_on_reply ?? true);
    setContactWindow(settingsData.contact_window_enabled ?? true);
    setTimezone(settingsData.timezone || 'America/New_York');
    setSignature(settingsData.signature || '');
    setApprovalMode(settingsData.approval_mode || 'off');
    setApprovalThreshold(
      settingsData.approval_threshold_amount != null ? String(settingsData.approval_threshold_amount) : ''
    );
  }, [settingsData]);

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => (await api.patch('/settings', patch)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      queryClient.invalidateQueries({ queryKey: AUTOPILOT_STATUS_KEY });
      setSavedAt(Date.now());
      setTimeout(() => setSavedAt(null), 2500);
    },
  });

  const patch = (payload: Record<string, unknown>) => save.mutate(payload);

  return (
    <section className={cardCls}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="text-base font-bold text-gray-900">Guardrails &amp; timing</h3>
        {savedAt && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle className="w-3.5 h-3.5" /> Saved
          </span>
        )}
      </div>

      {/* Autonomy */}
      <div className="mt-4 rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-800">Autonomy level</span>
        </div>
        <select
          value={approvalMode}
          onChange={(e) => {
            const next = e.target.value as 'off' | 'first_batch' | 'amount_threshold';
            setApprovalMode(next);
            patch({
              approval_mode: next,
              approval_threshold_amount:
                next === 'amount_threshold' && approvalThreshold !== ''
                  ? Number(approvalThreshold)
                  : null,
            });
          }}
          className={inputCls}
        >
          <option value="off">Fully automatic — send every reminder</option>
          <option value="first_batch">Review the first reminder per invoice</option>
          <option value="amount_threshold">Review reminders above an amount</option>
        </select>
        <p className="mt-1 text-[11px] text-gray-400">
          Holds a ready-to-send draft in the{' '}
          <Link to="/approvals" className="text-blue-600 hover:underline">
            approval queue
          </Link>
          ; approved reminders resume automatically.
        </p>
        {approvalMode === 'amount_threshold' && (
          <div className="mt-3 flex items-end gap-2">
            <label className={labelCls}>
              Require approval at or above
              <input
                type="number"
                min="0"
                step="0.01"
                value={approvalThreshold}
                onChange={(e) => setApprovalThreshold(e.target.value)}
                placeholder="1000"
                className={`${inputCls} mt-1 font-normal`}
              />
            </label>
            <button
              onClick={() => patch({ approval_threshold_amount: Number(approvalThreshold) })}
              disabled={approvalThreshold === ''}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-lg"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {/* Send window */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-800">Send window</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Time zone</label>
            <select
              value={timezone}
              onChange={(e) => {
                setTimezone(e.target.value);
                patch({ timezone: e.target.value });
              }}
              className={inputCls}
            >
              {[
                'America/New_York',
                'America/Chicago',
                'America/Denver',
                'America/Los_Angeles',
                'UTC',
                'Europe/London',
              ].map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={contactWindow}
                onChange={(e) => {
                  setContactWindow(e.target.checked);
                  patch({ contact_window_enabled: e.target.checked });
                }}
              />
              Only send 8am–9pm
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={skipWeekends}
                onChange={(e) => {
                  setSkipWeekends(e.target.checked);
                  patch({ skip_weekends: e.target.checked });
                }}
              />
              Skip weekends
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Send days</label>
            <div className="flex flex-wrap gap-2">
              {DAY_LABELS.map((label, i) => {
                const selected = sendWindowDays.includes(i);
                return (
                  <button
                    key={label}
                    onClick={() => {
                      const next = selected
                        ? sendWindowDays.filter((d) => d !== i)
                        : [...sendWindowDays, i].sort();
                      setSendWindowDays(next);
                      patch({ send_window_days: next.length === 7 ? null : next });
                    }}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${
                      selected
                        ? 'border-blue-300 bg-blue-50 text-blue-800'
                        : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Reminders only leave on the selected days. All 7 selected = every day.
            </p>
          </div>
        </div>
      </div>

      {/* Guardrails */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-800">Guardrails</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Minimum invoice amount to chase</label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                placeholder="No minimum"
                className={inputCls}
              />
              <button
                onClick={() => patch({ min_amount: minAmount === '' ? null : Number(minAmount) })}
                className="border border-gray-200 text-xs font-semibold px-3 rounded-lg hover:bg-gray-50"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Invoices below this are skipped entirely.</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 sm:mt-6">
            <input
              type="checkbox"
              checked={suppressOnReply}
              onChange={(e) => {
                setSuppressOnReply(e.target.checked);
                patch({ suppress_on_reply: e.target.checked });
              }}
            />
            Pause chasing for 7 days after the client replies
          </label>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-800">WhatsApp follow-up</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Delay after the email (hours)</label>
            <input
              type="number"
              min={0}
              max={168}
              value={waDelay}
              onChange={(e) => setWaDelay(Number(e.target.value))}
              onBlur={() => patch({ whatsapp_delay_hours: waDelay })}
              className={inputCls}
            />
          </div>
          <div className="flex flex-col justify-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={waQuietEnabled}
                onChange={(e) => {
                  setWaQuietEnabled(e.target.checked);
                  patch({
                    whatsapp_quiet_hours: e.target.checked
                      ? { start: waQuietStart, end: waQuietEnd }
                      : null,
                  });
                }}
              />
              Quiet hours
            </label>
            {waQuietEnabled && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={waQuietStart}
                  onChange={(e) => setWaQuietStart(Number(e.target.value))}
                  onBlur={() => patch({ whatsapp_quiet_hours: { start: waQuietStart, end: waQuietEnd } })}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5"
                />
                <span>to</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={waQuietEnd}
                  onChange={(e) => setWaQuietEnd(Number(e.target.value))}
                  onBlur={() => patch({ whatsapp_quiet_hours: { start: waQuietStart, end: waQuietEnd } })}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5"
                />
                <span>· client local time</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sender identity */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-800">Sender identity</span>
        </div>
        <label className={labelCls}>Email signature</label>
        <textarea
          rows={3}
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          onBlur={() => patch({ signature })}
          className={inputCls}
        />
      </div>

      <p className="mt-5 text-[11px] text-gray-400">
        Every change saves automatically. Content lives in{' '}
        <Link to="/templates" className="text-blue-600 hover:underline">
          Voice &amp; templates
        </Link>
        .
      </p>
    </section>
  );
};

/* ----------------------------------------------------- escalation rules */

const CONDITION_FIELDS = [
  { value: 'days_overdue', label: 'Days overdue' },
  { value: 'balance', label: 'Invoice balance' },
  { value: 'step_index', label: 'Sequence step' },
];
const ACTION_FIELDS = [
  { value: 'notify', label: 'Send me an in-app alert' },
  { value: 'email', label: 'Email me' },
  { value: 'pause', label: 'Pause this invoice' },
];

const EscalationRulesSection: React.FC = () => {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [field, setField] = useState('days_overdue');
  const [operator, setOperator] = useState('gte');
  const [value, setValue] = useState('30');
  const [action, setAction] = useState('notify');

  const { data } = useQuery({
    queryKey: ['escalationRules'],
    queryFn: async () => (await api.get('/escalation-rules')).data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['escalationRules'] });
    queryClient.invalidateQueries({ queryKey: AUTOPILOT_STATUS_KEY });
  };

  const createRule = useMutation({
    mutationFn: async () =>
      (
        await api.post('/escalation-rules', {
          name: name || `${field.replace('_', ' ')} ${operator} ${value}`,
          enabled: true,
          conditions: { field, operator, value: Number(value) },
          actions: { type: action },
          position: (data?.items?.length ?? 0),
        })
      ).data,
    onSuccess: () => {
      setName('');
      setValue('30');
      invalidate();
    },
  });

  const toggleRule = useMutation({
    mutationFn: async (rule: EscalationRule) =>
      (
        await api.patch(`/escalation-rules/${rule.id}`, {
          name: rule.name,
          enabled: !rule.enabled,
          conditions: rule.conditions,
          actions: rule.actions,
          position: rule.position,
        })
      ).data,
    onSuccess: invalidate,
  });

  const deleteRule = useMutation({
    mutationFn: async (ruleId: string) => (await api.delete(`/escalation-rules/${ruleId}`)).data,
    onSuccess: invalidate,
  });

  const rules: EscalationRule[] = data?.items ?? [];

  return (
    <section className={cardCls}>
      <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
        Escalation rules
      </h3>
      <p className="text-xs text-gray-500 mt-3">
        Autopilot handles the routine chasing. These rules pull you in when an invoice crosses a
        line you care about.
      </p>

      <div className="mt-4 space-y-2">
        {rules.length === 0 && (
          <p className="text-xs text-gray-400">
            No rules yet. Autopilot escalates anything 60+ days overdue by default.
          </p>
        )}
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="flex flex-wrap items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={() => toggleRule.mutate(rule)}
                className="rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-900">{rule.name}</span>
            </label>
            <span className="text-[11px] text-gray-500">
              {String(rule.conditions?.field ?? '').replace('_', ' ')}{' '}
              {String(rule.conditions?.operator ?? '') === 'gte' ? '≥' : '='}{' '}
              {String(rule.conditions?.value ?? '')} → {String(rule.actions?.type ?? '')}
            </span>
            <button
              onClick={() => deleteRule.mutate(rule.id)}
              className="ml-auto p-1.5 text-gray-400 hover:text-rose-600"
              title="Delete rule"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <p className="text-xs font-semibold text-gray-700 mb-2">Add a rule</p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Rule name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs flex-1 min-w-32"
          />
          <select
            value={field}
            onChange={(e) => setField(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          >
            {CONDITION_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          >
            <option value="gte">is at least</option>
            <option value="eq">equals</option>
          </select>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs"
          >
            {ACTION_FIELDS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => createRule.mutate()}
            disabled={createRule.isPending}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-semibold px-3 py-2 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------- page */

export const Autopilot: React.FC = () => {
  const settingsRef = React.useRef<HTMLDivElement | null>(null);
  const { data } = useAutopilotStatus();

  const scrollToSettings = () =>
    settingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Autopilot
            {data?.active && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> On
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Everything GentleTap does on its own — and every limit you set on it.
          </p>
        </div>
        <Link
          to="/templates"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-2 rounded-lg"
        >
          <Sparkles className="w-3.5 h-3.5" /> Voice &amp; templates
        </Link>
      </div>

      <AutopilotHero onOpenSettings={scrollToSettings} />
      <div ref={settingsRef} className="space-y-6 scroll-mt-6">
        <RunStateSection />
        <CadenceSection />
        <ControlCenterSection />
        <EscalationRulesSection />
      </div>

      <p className="text-[11px] text-gray-400 pb-2">
        Profile, notifications, team and data controls stay in{' '}
        <Link to="/settings" className="text-blue-600 hover:underline">
          Account settings
        </Link>
        .
      </p>
    </div>
  );
};
