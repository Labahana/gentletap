import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ModeToggle } from '@/components/ModeToggle';
import { useOnboardingStore } from '@/stores/onboardingStore';

const TONES = ['warm', 'friendly', 'professional'] as const;
type Tone = (typeof TONES)[number];

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { step, setStep } = useOnboardingStore();
  const [sender, setSender] = useState<'gentletap' | 'gmail'>('gentletap');
  const [mode, setMode] = useState<'template' | 'autopilot'>('template');
  const [tone, setTone] = useState<Tone>('friendly');
  const [error, setError] = useState('');

  const { data: state } = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => (await api.get('/onboarding')).data,
  });

  const { data: draftsData } = useQuery({
    queryKey: ['onboardingDrafts'],
    queryFn: async () => (await api.get('/onboarding/preview-drafts')).data,
    enabled: step === 3,
  });

  useEffect(() => {
    if (state?.step) setStep(Math.min(state.step, 5));
    if (state?.complete) navigate('/dashboard');
  }, [state, setStep, navigate]);

  const advance = useMutation({
    mutationFn: async (payload: { step: number; data?: any }) =>
      (await api.post('/onboarding/step', payload)).data,
    onSuccess: (data) => {
      setError('');
      setStep(data.step);
      qc.invalidateQueries({ queryKey: ['onboarding'] });
      if (data.complete) navigate('/dashboard');
    },
    onError: (err: any) => setError(err?.response?.data?.detail || 'Could not continue'),
  });

  const skip = async () => {
    await api.post('/onboarding/skip');
    navigate('/dashboard');
  };

  const drafts = draftsData?.drafts || [];
  const heroDraft = drafts.find((d: any) => d.tone === tone) || drafts[0];
  const isSample = draftsData?.is_sample || heroDraft?.is_sample;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to GentleTap</h1>
            <p className="text-sm text-gray-500 mt-1">
              Polite, personal reminders when clients don't pay — and we stop the moment they do.
            </p>
          </div>
          <button onClick={skip} className="text-xs text-gray-500 hover:text-gray-800">
            Save for later
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Read-only access. Nothing sends until you approve it.
        </p>
        <ProgressBar step={step} />

        {error && <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Where do your unpaid invoices live?</h2>
            <p className="text-sm text-gray-600">Link your accounting tool so we can draft reminders for your real invoices.</p>
            <div className="grid gap-3">
              {['QuickBooks', 'FreshBooks'].map((label) => (
                <button
                  key={label}
                  onClick={() => navigate('/integrations')}
                  className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500"
                >
                  <div className="text-sm font-semibold text-gray-900">Connect {label}</div>
                  <div className="text-xs text-gray-500">Sync unpaid invoices & customers automatically</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/integrations')}
              className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500"
            >
              <div className="text-sm font-semibold text-gray-900">Import a CSV</div>
              <div className="text-xs text-gray-500">Upload existing invoices manually</div>
            </button>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="h-px bg-gray-200 flex-1" />
              or
              <span className="h-px bg-gray-200 flex-1" />
            </div>

            <button
              onClick={() => advance.mutate({ step: 1, data: { sample: true } })}
              className="text-sm font-semibold text-blue-600"
            >
              Try a sample invoice instead
            </button>
            <div className="flex justify-end">
              <button
                onClick={() => advance.mutate({ step: 1, data: {} })}
                className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
              >
                I'm connected — continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">How should reminders be sent?</h2>
            <p className="text-sm text-gray-600">
              Reminders go out as email. Choose whose address they come from.
            </p>
            <div className="grid gap-3">
              <button
                onClick={() => setSender('gentletap')}
                className={`text-left border rounded-xl p-4 ${
                  sender === 'gentletap' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">GentleTap sender</div>
                <div className="text-xs text-gray-500">Sent from GentleTap's delivery domain — works instantly, no setup.</div>
              </button>
              <button
                onClick={() => setSender('gmail')}
                className={`text-left border rounded-xl p-4 ${
                  sender === 'gmail' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">Send from my Gmail</div>
                <div className="text-xs text-gray-500">Reminders come from your own address. Higher deliverability, personal replies.</div>
              </button>
            </div>
            {sender === 'gmail' && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Requires a one-time Google connection.</span>
                <button onClick={() => navigate('/integrations')} className="font-medium text-blue-600">
                  Connect Gmail →
                </button>
              </div>
            )}
            <button
              onClick={() => advance.mutate({ step: 2, data: { sender } })}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Here's a draft we'd send</h2>
            {isSample && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                No invoices synced yet — this is a sample invoice to show you the voice.
              </p>
            )}

            <div className="flex gap-2 flex-wrap">
              {TONES.map((t) => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                    tone === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {['Warm', 'Friendly', 'Professional'][TONES.indexOf(t)]}
                </button>
              ))}
            </div>

            {heroDraft ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-slate-50">
                <div className="text-[10px] uppercase font-bold text-blue-600 mb-1">
                  {heroDraft.tone} · #{heroDraft.invoice_number}
                </div>
                <div className="text-sm font-semibold text-gray-900">{heroDraft.subject}</div>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">{heroDraft.body}</p>
              </div>
            ) : (
              <p className="text-xs text-gray-400">Preparing your draft…</p>
            )}

            <button
              onClick={() => advance.mutate({ step: 3, data: { templates_previewed: true, tone } })}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              Looks good
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">How hands-on do you want to be?</h2>
            <p className="text-sm text-gray-600">
              Start in <span className="font-semibold text-gray-800">Template mode</span> — you review and approve each
              reminder before it goes out. Switch to Autopilot any time once you trust the flow.
            </p>
            <ModeToggle mode={mode} onChange={setMode} />
            <button
              onClick={() => advance.mutate({ step: 4, data: { operation_mode: mode } })}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              Continue
            </button>
          </div>
        )}

        {step >= 5 && (
          <div className="space-y-4 text-center py-6">
            <h2 className="text-2xl font-bold text-gray-900">You're all set!</h2>
            <p className="text-sm text-gray-600">
              Your first reminder is ready to review{heroDraft ? ` for invoice ${heroDraft.invoice_number}` : ''}.
            </p>
            <button
              onClick={() => advance.mutate({ step: 5, data: {} })}
              className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
            >
              Review my first reminder
            </button>
          </div>
        )}
      </div>
    </div>
  );
};