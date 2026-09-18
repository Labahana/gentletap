import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiErrorMessage } from '@/lib/api';
import { ProgressBar } from '@/components/onboarding/ProgressBar';
import { ModeToggle } from '@/components/ModeToggle';
import { useOnboardingStore } from '@/stores/onboardingStore';

const TONES = ['warm', 'friendly', 'professional'] as const;
type Tone = (typeof TONES)[number];
type Sender = 'gentletap' | 'gmail';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { step, setStep } = useOnboardingStore();
  const [sender, setSender] = useState<Sender>('gentletap');
  const [mode, setMode] = useState<'template' | 'autopilot'>('template');
  const [tone, setTone] = useState<Tone>('friendly');
  const [error, setError] = useState('');
  const [connectingProvider, setConnectingProvider] = useState<'' | 'quickbooks' | 'freshbooks' | 'gmail'>('');
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const { data: state } = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => (await api.get('/onboarding')).data,
  });

  const {
    data: draftsData,
    isError: draftsError,
    isFetching: draftsLoading,
    refetch: refetchDrafts,
  } = useQuery({
    queryKey: ['onboardingDrafts'],
    queryFn: async () => (await api.get('/onboarding/preview-drafts')).data,
    enabled: step === 3,
    retry: false,
  });

  useEffect(() => {
    if (state?.step) setStep(Math.min(state.step, 5));
    if (state?.complete || state?.dismissed) navigate('/dashboard');
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

  const back = useMutation({
    mutationFn: async () => (await api.post('/onboarding/back')).data,
    onSuccess: (data) => {
      setError('');
      setStep(data.step);
      qc.invalidateQueries({ queryKey: ['onboarding'] });
    },
    onError: (err: any) => setError(err?.response?.data?.detail || 'Could not go back'),
  });

  // --- Step 1: in-flow connections -------------------------------------

  const connectQuickBooks = async () => {
    setError('');
    setConnectingProvider('quickbooks');
    try {
      await api.get('/connections/quickbooks/callback');
      advance.mutate({ step: 1, data: { accounting_connected: true, provider: 'quickbooks' } });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not connect QuickBooks'));
    } finally {
      setConnectingProvider('');
    }
  };

  const connectFreshBooks = async () => {
    setError('');
    setConnectingProvider('freshbooks');
    try {
      await api.get('/connections/freshbooks/callback');
      advance.mutate({ step: 1, data: { accounting_connected: true, provider: 'freshbooks' } });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not connect FreshBooks'));
    } finally {
      setConnectingProvider('');
    }
  };

  const onCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploadingCsv(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const preview = (
        await api.post('/invoices/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      ).data;
      const rows = (preview?.preview || []).filter((r: any) => r.is_valid);
      if (!rows.length) {
        setError('No valid invoices found in that file. Check the columns and try again.');
        return;
      }
      await api.post('/invoices/confirm-import', { rows });
      advance.mutate({ step: 1, data: { accounting_connected: true, provider: 'csv' } });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not import that file'));
    } finally {
      setUploadingCsv(false);
    }
  };

  // --- Step 2: Gmail connect-in-flow -----------------------------------

  const chooseSender = async (chosen: Sender) => {
    setSender(chosen);
    if (chosen === 'gentletap') return;
    setError('');
    setConnectingProvider('gmail');
    try {
      await api.get('/connections/google/callback');
      advance.mutate({ step: 2, data: { sender: 'gmail' } });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not connect Gmail'));
    } finally {
      setConnectingProvider('');
    }
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
            <p className="text-sm text-gray-600">Connect your accounting tool and we'll draft reminders for your real invoices.</p>
            <div className="grid gap-3">
              <button
                onClick={connectQuickBooks}
                disabled={!!connectingProvider}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500 disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {connectingProvider === 'quickbooks' ? 'Connecting QuickBooks…' : 'Connect QuickBooks'}
                </div>
                <div className="text-xs text-gray-500">Sync unpaid invoices & customers automatically</div>
              </button>
              <button
                onClick={connectFreshBooks}
                disabled={!!connectingProvider}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500 disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {connectingProvider === 'freshbooks' ? 'Connecting FreshBooks…' : 'Connect FreshBooks'}
                </div>
                <div className="text-xs text-gray-500">Sync unpaid invoices & customers automatically</div>
              </button>
            </div>
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={onCsvFile}
            />
            <button
              onClick={() => csvInputRef.current?.click()}
              disabled={!!connectingProvider || uploadingCsv}
              className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500 disabled:opacity-60"
            >
              <div className="text-sm font-semibold text-gray-900">
                {uploadingCsv ? 'Importing CSV…' : 'Import a CSV'}
              </div>
              <div className="text-xs text-gray-500">Upload unpaid invoices from a spreadsheet</div>
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
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <button
              onClick={() => back.mutate()}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              ← Back
            </button>
            <h2 className="text-lg font-bold text-gray-900">How should reminders be sent?</h2>
            <p className="text-sm text-gray-600">
              Reminders go out as email. Choose whose address they come from.
            </p>
            <div className="grid gap-3">
              <button
                onClick={() => chooseSender('gentletap')}
                className={`text-left border rounded-xl p-4 ${
                  sender === 'gentletap' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">GentleTap sender</div>
                <div className="text-xs text-gray-500">Sent from GentleTap's delivery domain — works instantly, no setup.</div>
              </button>
              <button
                onClick={() => chooseSender('gmail')}
                disabled={!!connectingProvider}
                className={`text-left border rounded-xl p-4 disabled:opacity-60 ${
                  sender === 'gmail' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-sm font-semibold text-gray-900">
                  {connectingProvider === 'gmail' ? 'Connecting Gmail…' : 'Send from my Gmail'}
                </div>
                <div className="text-xs text-gray-500">
                  Reminders come from your own address — connects your Google account now.
                </div>
              </button>
            </div>
            {sender === 'gentletap' && (
              <button
                onClick={() => advance.mutate({ step: 2, data: { sender: 'gentletap' } })}
                className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <button
              onClick={() => back.mutate()}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              ← Back
            </button>
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

            {draftsLoading && !heroDraft && <p className="text-xs text-gray-400">Preparing your draft…</p>}

            {draftsError && !heroDraft && (
              <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
                Could not load a draft.{' '}
                <button onClick={() => refetchDrafts()} className="font-semibold underline">
                  Try again
                </button>
              </div>
            )}

            {heroDraft ? (
              <div className="border border-gray-200 rounded-xl p-4 bg-slate-50">
                <div className="text-[10px] uppercase font-bold text-blue-600 mb-1">
                  {heroDraft.tone} · #{heroDraft.invoice_number}
                </div>
                <div className="text-sm font-semibold text-gray-900">{heroDraft.subject}</div>
                <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap leading-relaxed">{heroDraft.body}</p>
              </div>
            ) : null}

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
            <button
              onClick={() => back.mutate()}
              className="text-xs font-medium text-gray-500 hover:text-gray-800"
            >
              ← Back
            </button>
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
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => advance.mutate({ step: 5, data: {} })}
                className="bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg"
              >
                Review my first reminder
              </button>
              <button
                onClick={() => back.mutate()}
                className="text-xs font-medium text-gray-500 hover:text-gray-800"
              >
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};