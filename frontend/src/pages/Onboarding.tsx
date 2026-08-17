import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ModeToggle } from '@/components/ModeToggle';
import { useOnboardingStore } from '@/stores/onboardingStore';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { step, setStep } = useOnboardingStore();
  const [senderEmail, setSenderEmail] = useState('');
  const [mode, setMode] = useState<'template' | 'autopilot'>('template');
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to GentleTap</h1>
            <p className="text-sm text-gray-500 mt-1">Let's get your first automated reminders live.</p>
          </div>
          <button onClick={skip} className="text-xs text-gray-500 hover:text-gray-800">
            Skip for now
          </button>
        </div>
        <ProgressBar step={step} />

        {error && <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">{error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Connect accounting</h2>
            <p className="text-sm text-gray-600">Link QuickBooks, FreshBooks, or import a CSV.</p>
            <div className="grid gap-3">
              {['QuickBooks', 'FreshBooks', 'CSV Upload'].map((label) => (
                <button
                  key={label}
                  onClick={() =>
                    advance.mutate({
                      step: 1,
                      data: { accounting_connected: true, csv_imported: label === 'CSV Upload' },
                    })
                  }
                  className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500"
                >
                  <div className="text-sm font-semibold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-500">Continue with {label}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => navigate('/integrations')}
              className="text-xs font-medium text-blue-600"
            >
              Open Integrations page
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Sender email</h2>
            <p className="text-sm text-gray-600">Confirm the address clients will see on reminders.</p>
            <input
              type="email"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              disabled={!senderEmail}
              onClick={() =>
                advance.mutate({ step: 2, data: { sender_email: senderEmail, sender_verified: true } })
              }
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Preview AI drafts</h2>
            <p className="text-sm text-gray-600">Review sample reminders for your unpaid invoices.</p>
            <div className="space-y-3 max-h-72 overflow-y-auto">
              {(draftsData?.drafts || []).slice(0, 6).map((d: any, i: number) => (
                <div key={i} className="border border-gray-200 rounded-lg p-3">
                  <div className="text-[10px] uppercase font-bold text-blue-600 mb-1">
                    {d.tone} · #{d.invoice_number}
                  </div>
                  <div className="text-xs font-semibold text-gray-900">{d.subject}</div>
                  <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap line-clamp-4">{d.body}</p>
                </div>
              ))}
              {!draftsData?.drafts?.length && (
                <p className="text-xs text-gray-400">No unpaid invoices yet — you can still continue.</p>
              )}
            </div>
            <button
              onClick={() => advance.mutate({ step: 3, data: { templates_previewed: true } })}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              Looks good
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Choose operation mode</h2>
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
            <p className="text-sm text-gray-600">Invoices synced, templates ready, mode selected.</p>
            <button
              onClick={() => advance.mutate({ step: 5, data: {} })}
              className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
            >
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
