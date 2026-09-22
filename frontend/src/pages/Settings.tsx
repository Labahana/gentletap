import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { ModeToggle } from '@/components/ModeToggle';
import { DigestPreview } from '@/components/DigestPreview';

export const Settings: React.FC = () => {
  const { updateOrgName } = useAuthStore();
  const queryClient = useQueryClient();

  const [userName, setUserName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [signature, setSignature] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [stopAfterDays, setStopAfterDays] = useState(30);
  const [contactWindow, setContactWindow] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [sendThankYou, setSendThankYou] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(true);
  const [escalationAlerts, setEscalationAlerts] = useState(true);
  const [mode, setMode] = useState<'template' | 'autopilot'>('template');
  const [savedSuccess, setSavedSuccess] = useState(false);
  // Automation guardrails (phase 6 control center)
  const [minAmount, setMinAmount] = useState('');
  const [suppressOnReply, setSuppressOnReply] = useState(true);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [sendWindowDays, setSendWindowDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [waDelay, setWaDelay] = useState(3);
  const [waQuietEnabled, setWaQuietEnabled] = useState(false);
  const [waQuietStart, setWaQuietStart] = useState(21);
  const [waQuietEnd, setWaQuietEnd] = useState(8);
  const [pauseAll, setPauseAll] = useState(false);
  const [pauseUntil, setPauseUntil] = useState('');
  const [pauseReason, setPauseReason] = useState('');

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get('/settings')).data,
  });

  useEffect(() => {
    if (!settingsData) return;
    setUserName(settingsData.user_name || '');
    setOrgName(settingsData.org_name || '');
    setSignature(settingsData.signature || '');
    setTimezone(settingsData.timezone || 'America/New_York');
    setStopAfterDays(settingsData.stop_after_days ?? 30);
    setContactWindow(settingsData.contact_window_enabled ?? true);
    setDailyDigest(settingsData.daily_digest ?? true);
    setSendThankYou(settingsData.send_thank_you ?? true);
    setPaymentAlerts(settingsData.payment_alerts ?? true);
    setEscalationAlerts(settingsData.escalation_alerts ?? true);
    setMode((settingsData.operation_mode as 'template' | 'autopilot') || 'template');
    setMinAmount(settingsData.min_amount != null ? String(settingsData.min_amount) : '');
    setSuppressOnReply(settingsData.suppress_on_reply ?? true);
    setSkipWeekends(settingsData.skip_weekends ?? false);
    setSendWindowDays(settingsData.send_window_days ?? [0, 1, 2, 3, 4, 5, 6]);
    setWaDelay(settingsData.whatsapp_delay_hours ?? 3);
    const qh = settingsData.whatsapp_quiet_hours;
    setWaQuietEnabled(!!qh);
    setWaQuietStart(qh?.start ?? 21);
    setWaQuietEnd(qh?.end ?? 8);
    setPauseAll(settingsData.pause_all ?? false);
    setPauseUntil(
      settingsData.pause_until ? new Date(settingsData.pause_until).toISOString().slice(0, 16) : ''
    );
    setPauseReason(settingsData.pause_reason || '');
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: async () =>
      (
        await api.patch('/settings', {
          user_name: userName,
          org_name: orgName,
          signature,
          timezone,
          stop_after_days: stopAfterDays,
          contact_window_enabled: contactWindow,
          daily_digest: dailyDigest,
          send_thank_you: sendThankYou,
          payment_alerts: paymentAlerts,
          escalation_alerts: escalationAlerts,
          min_amount: minAmount === '' ? null : Number(minAmount),
          suppress_on_reply: suppressOnReply,
          skip_weekends: skipWeekends,
          send_window_days: sendWindowDays.length === 7 ? null : sendWindowDays,
          whatsapp_delay_hours: waDelay,
          whatsapp_quiet_hours: waQuietEnabled ? { start: Number(waQuietStart), end: Number(waQuietEnd) } : null,
        })
      ).data,
    onSuccess: (data) => {
      updateOrgName(data.org_name);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post('/settings/pause-all', {
          until: pauseUntil ? new Date(pauseUntil).toISOString() : null,
          reason: pauseReason || null,
        })
      ).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => (await api.post('/settings/resume-all')).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings'] }),
  });

  const modeMutation = useMutation({
    mutationFn: async (next: 'template' | 'autopilot') => {
      if (next === 'autopilot') {
        const ok = window.confirm(
          'Switch to Autopilot? GentleTap will generate tone templates and a default auto-assign sequence.'
        );
        if (!ok) throw new Error('cancelled');
      }
      return (await api.patch('/settings/operation-mode', { mode: next, confirm: true })).data;
    },
    onSuccess: (data) => {
      setMode(data.mode);
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Profile, operation mode, reminder defaults, and notifications
        </p>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          Settings updated successfully!
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Operation Mode</h3>
        <ModeToggle
          mode={mode}
          saving={modeMutation.isPending}
          onChange={(m) => modeMutation.mutate(m)}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-6">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Profile & Organization</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Your Full Name</label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Organization Name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Signature</label>
            <textarea
              rows={3}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Reminder Defaults</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Stop after (days)</label>
            <select
              value={stopAfterDays}
              onChange={(e) => setStopAfterDays(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {[30, 60, 90].map((d) => (
                <option key={d} value={d}>
                  {d} days
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 mt-6">
            <input type="checkbox" checked={contactWindow} onChange={(e) => setContactWindow(e.target.checked)} />
            Enforce contact window (8am–9pm)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={sendThankYou} onChange={(e) => setSendThankYou(e.target.checked)} />
            Send thank-you after payment
          </label>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-5">
        <div>
          <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
            Automation Guardrails
          </h3>
          <p className="text-xs text-gray-500 mt-2">
            Applies on top of your operation mode — you stay in control of what GentleTap may send.
          </p>
        </div>

        {pauseAll ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="font-semibold">All reminders are paused.</span>
              {pauseUntil && (
                <span> Resumes {new Date(pauseUntil).toLocaleString()}.</span>
              )}
              {pauseReason && <span className="block mt-0.5">Reason: {pauseReason}</span>}
            </div>
            <button
              onClick={() => resumeMutation.mutate()}
              disabled={resumeMutation.isPending}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              {resumeMutation.isPending ? 'Resuming…' : 'Resume all'}
            </button>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Pause everything</p>
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
                onClick={() => pauseMutation.mutate()}
                disabled={pauseMutation.isPending}
                className="border border-amber-300 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-amber-50"
              >
                {pauseMutation.isPending ? 'Pausing…' : 'Pause all reminders'}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              Leave the date empty to pause indefinitely. Paused reminders reschedule automatically.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Minimum invoice amount to chase
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="No minimum"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Invoices below this amount are skipped entirely.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              WhatsApp follow-up delay (hours)
            </label>
            <input
              type="number"
              min={0}
              max={168}
              value={waDelay}
              onChange={(e) => setWaDelay(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Send days</label>
            <div className="flex flex-wrap gap-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, i) => (
                <label
                  key={label}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border cursor-pointer ${
                    sendWindowDays.includes(i)
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-gray-200 text-gray-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={sendWindowDays.includes(i)}
                    onChange={(e) =>
                      setSendWindowDays((prev) =>
                        e.target.checked ? [...prev, i].sort() : prev.filter((d) => d !== i)
                      )
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Reminders only go out on the selected days.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
            />
            Skip weekends (same as unchecking Sat &amp; Sun)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={suppressOnReply}
              onChange={(e) => setSuppressOnReply(e.target.checked)}
            />
            Pause chasing after the client replies (7-day grace)
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={waQuietEnabled}
                onChange={(e) => setWaQuietEnabled(e.target.checked)}
              />
              WhatsApp quiet hours
            </label>
            {waQuietEnabled && (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={waQuietStart}
                  onChange={(e) => setWaQuietStart(Number(e.target.value))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5"
                />
                <span>to</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={waQuietEnd}
                  onChange={(e) => setWaQuietEnd(Number(e.target.value))}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1.5"
                />
                <span>(24h, client local time)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-3">
          <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Notifications</h3>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={dailyDigest} onChange={(e) => setDailyDigest(e.target.checked)} />
            Daily digest email (8am local)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={paymentAlerts} onChange={(e) => setPaymentAlerts(e.target.checked)} />
            Payment received alerts
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={escalationAlerts}
              onChange={(e) => setEscalationAlerts(e.target.checked)}
            />
            Escalation alerts
          </label>
        </div>
        <DigestPreview />
      </div>

      <button
        onClick={() => updateMutation.mutate()}
        disabled={updateMutation.isPending}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm shadow-xs"
      >
        {updateMutation.isPending ? 'Saving…' : 'Save Settings'}
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Data & Privacy</h3>
        <p className="text-xs text-gray-500">
          Export all organization data or request account deletion (30-day grace period).
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              await api.post('/settings/export-data');
              alert('Export started — check your email for the download.');
            }}
            className="border border-gray-200 text-xs font-semibold px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            Export data
          </button>
          <button
            onClick={async () => {
              const name = window.prompt('Type your organization name to confirm deletion:');
              if (!name) return;
              await api.delete('/settings/account');
              alert('Deletion scheduled. You have 30 days to cancel from Settings.');
            }}
            className="border border-rose-200 text-rose-700 text-xs font-semibold px-4 py-2 rounded-lg"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
};
