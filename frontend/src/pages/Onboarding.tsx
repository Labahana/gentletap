import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Sparkles } from 'lucide-react';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const { step, setStep } = useOnboardingStore();
  const [sender, setSender] = useState<Sender>('gentletap');
  const [mode, setMode] = useState<'template' | 'autopilot'>('template');
  const [tone, setTone] = useState<Tone>('friendly');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [connectingProvider, setConnectingProvider] = useState<'' | 'quickbooks' | 'freshbooks' | 'gmail'>('');
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
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

  // --- OAuth callback handling ------------------------------------------
  // The backend provider callbacks 302 back here with query params:
  //   ?connected=quickbooks&invoices=12  |  ?connect_error=gmail&message=...
  useEffect(() => {
    const connected = searchParams.get('connected');
    const connectError = searchParams.get('connect_error');
    const message = searchParams.get('message');
    if (!connected && !connectError) return;

    if (connectError) {
      setError(message || `Could not connect ${connectError}. Please try again.`);
      setConnectingProvider('');
    } else if (connected) {
      setError('');
      const label =
        connected === 'gmail' ? 'Gmail' : connected === 'quickbooks' ? 'QuickBooks' : 'FreshBooks';
      const email = searchParams.get('email');
      const invoices = searchParams.get('invoices');
      const syncFailed = searchParams.get('sync') === 'failed';
      setNotice(
        syncFailed
          ? `${label} connected, but the first sync failed — you can retry it from Integrations later.`
          : connected === 'gmail'
            ? `${label}${email ? ` (${email})` : ''} connected.`
            : `${label} connected${invoices ? ` — ${invoices} invoices synced` : ''}.`,
      );
      if (connected === 'gmail') {
        setSender('gmail');
        advance.mutate({ step: 2, data: { sender: 'gmail' } });
      } else {
        advance.mutate({ step: 1, data: { accounting_connected: true, provider: connected } });
      }
      // Sync results change invoice data everywhere.
      qc.invalidateQueries();
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, qc]);

  // --- Step 1: in-flow connections -------------------------------------
  // Ask the backend for a provider authorization URL. If real OAuth creds
  // are configured the browser is redirected to the provider and the
  // backend callback brings us back with ?connected=...; otherwise the
  // backend connects in mock mode (dev) and we advance immediately.

  const startConnect = async (provider: 'quickbooks' | 'freshbooks' | 'gmail') => {
    setError('');
    setNotice('');
    setConnectingProvider(provider);
    try {
      const res = await api.post(`/connections/${provider === 'gmail' ? 'google' : provider}/auth-url`);
      const url = res.data?.url;
      if (url) {
        window.location.href = url; // full redirect to provider
        return; // page navigates away
      }
      // Mock mode: backend connected immediately with mock tokens.
      setNotice(
        provider === 'gmail'
          ? 'Gmail connected (dev mode — no real Google credentials configured).'
          : `${provider === 'quickbooks' ? 'QuickBooks' : 'FreshBooks'} connected (dev mode) with sample data.`,
      );
      setConnectingProvider('');
      if (provider === 'gmail') {
        setSender('gmail');
        advance.mutate({ step: 2, data: { sender: 'gmail' } });
      } else {
        advance.mutate({ step: 1, data: { accounting_connected: true, provider } });
      }
    } catch (err) {
      setConnectingProvider('');
      setError(apiErrorMessage(err, `Could not connect ${provider}`));
    }
  };

  const onCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setNotice('');
    setUploadingCsv(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const preview = (
        await api.post('/invoices/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      ).data;
      const rows = (preview?.preview || []).filter((r: any) => r.is_valid);
      if (!rows.length) {
        setError('No valid invoices found in that file. Download the sample CSV to see the expected format.');
        return;
      }
      await api.post('/invoices/confirm-import', { rows });
      setNotice(`${rows.length} invoices imported.`);
      advance.mutate({ step: 1, data: { accounting_connected: true, provider: 'csv' } });
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not import that file'));
    } finally {
      setUploadingCsv(false);
    }
  };

  // --- Step 2: sender choice --------------------------------------------

  const chooseSender = (chosen: Sender) => {
    setSender(chosen);
    if (chosen === 'gmail') {
      startConnect('gmail');
    }
  };

  // --- Step 4: upgrade ----------------------------------------------------

  const upgradeToPro = async () => {
    setError('');
    setUpgrading(true);
    try {
      const res = await api.post('/billing/checkout', { plan: 'pro', annual: false });
      if (res.data?.checkout_url && !res.data.mock) {
        window.location.href = res.data.checkout_url; // Paddle hosted checkout
        return;
      }
      // Mock checkout (dev) — refresh onboarding state so
      // autopilot becomes selectable, then switch to it.
      await qc.invalidateQueries({ queryKey: ['onboarding'] });
      setNotice('Pro checkout started. Complete payment to unlock Autopilot.');
      setMode('autopilot');
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not start checkout'));
    } finally {
      setUpgrading(false);
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
        {notice && !error && (
          <div className="mb-4 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {notice}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Where do your unpaid invoices live?</h2>
            <p className="text-sm text-gray-600">Connect your accounting tool and we'll draft reminders for your real invoices.</p>
            <div className="grid gap-3">
              <button
                onClick={() => startConnect('quickbooks')}
                disabled={!!connectingProvider || uploadingCsv}
                className="text-left border border-gray-200 rounded-xl p-4 hover:border-blue-500 disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-gray-900">
                  {connectingProvider === 'quickbooks' ? 'Connecting QuickBooks…' : 'Connect QuickBooks'}
                </div>
                <div className="text-xs text-gray-500">Sync unpaid invoices & customers automatically</div>
              </button>
              <button
                onClick={() => startConnect('freshbooks')}
                disabled={!!connectingProvider || uploadingCsv}
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

            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="h-px bg-gray-200 flex-1" />
              or
              <span className="h-px bg-gray-200 flex-1" />
            </div>

            <div className="flex items-center gap-4 text-xs">
              <button
                onClick={() => advance.mutate({ step: 1, data: { sample: true } })}
                className="font-semibold text-blue-600"
              >
                Try a sample invoice instead
              </button>
              <a
                href="/api/v1/invoices/import-sample"
                className="text-gray-500 hover:text-gray-800 underline"
              >
                Download sample CSV
              </a>
            </div>
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
              Both modes are available on every plan. Template mode keeps you in control; Autopilot
              sends reminders on its own schedule. Free plan includes 5 invoice collections per month —
              upgrade to Pro any time for unlimited collections and Autopilot.
            </p>
            <ModeToggle mode={mode} onChange={setMode} />
            <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-gray-700">
                  <div className="font-semibold text-gray-900">Unlock everything with Pro — $19/mo</div>
                  <ul className="mt-1 space-y-0.5">
                    <li>• Unlimited invoice collections (free plan: 5/mo)</li>
                    <li>• Autopilot — reminders send automatically</li>
                    <li>• Full QuickBooks &amp; FreshBooks live sync</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={upgradeToPro}
                disabled={upgrading}
                className="mt-3 w-full bg-white text-blue-700 border border-blue-200 text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 disabled:opacity-60"
              >
                {upgrading ? 'Starting checkout…' : 'Upgrade to Pro'}
              </button>
            </div>
            <button
              onClick={() => advance.mutate({ step: 4, data: { operation_mode: mode } })}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              Continue {mode === 'autopilot' ? 'with Autopilot' : 'on the free plan'}
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
