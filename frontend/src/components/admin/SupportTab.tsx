import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { Badge, Spinner, ConfirmButton, fmtDateTime } from '@/components/admin/adminUi';

type TranscriptMsg = { role: string; content: string; created_at?: string };

type Handoff = {
  id: string;
  session_id: string;
  org_id: string | null;
  org_name: string | null;
  surface: string;
  visitor_email: string | null;
  trigger: string | null;
  intent: string | null;
  sentiment: string | null;
  narrative: string | null;
  suggested_resolution: string | null;
  account: Record<string, any>;
  sources: string[];
  transcript: TranscriptMsg[];
  status: string;
  notified: boolean;
  admin_response: string | null;
  created_at: string | null;
  resolved_at: string | null;
};

type HandoffsPage = {
  total: number;
  counts: { open: number; in_progress: number; resolved: number };
  items: Handoff[];
};

const statusTone = (s: string): 'green' | 'amber' | 'red' | 'blue' | 'slate' =>
  s === 'open' ? 'amber' : s === 'in_progress' ? 'blue' : s === 'resolved' ? 'green' : 'slate';

const AccountSnapshot: React.FC<{ account: Record<string, any> }> = ({ account }) => {
  const entries = Object.entries(account ?? {}).filter(
    ([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
  );
  if (entries.length === 0) return null;
  return (
    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 bg-slate-50 border border-gray-200 rounded-lg p-3">
      {entries.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold truncate">{k.replace(/_/g, ' ')}</p>
          <p className="text-xs text-gray-800 font-medium truncate" title={String(v)}>
            {Array.isArray(v) ? `${v.length}` : typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </p>
        </div>
      ))}
    </div>
  );
};

const Transcript: React.FC<{ handoffId: string; initial: TranscriptMsg[] }> = ({ handoffId, initial }) => {
  const [messages, setMessages] = useState<TranscriptMsg[]>(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .get<{ messages: TranscriptMsg[] }>(`/admin/handoffs/${handoffId}/transcript`)
      .then((res) => {
        if (active && res.data?.messages?.length) setMessages(res.data.messages);
      })
      .catch(() => {
        /* fall back to the embedded transcript */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [handoffId]);

  if (loading && messages.length === 0) {
    return (
      <div className="py-2">
        <Spinner />
      </div>
    );
  }
  if (messages.length === 0) return <p className="text-xs text-gray-400">No transcript.</p>;
  return (
    <ol className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {messages.map((m, i) => (
        <li key={i} className={`text-sm rounded-lg px-3 py-2 ${m.role === 'user' ? 'bg-blue-50 text-blue-900' : 'bg-slate-50 text-gray-700'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400 block mb-0.5">{m.role === 'user' ? 'Visitor' : 'Bot'}</span>
          <span className="whitespace-pre-wrap break-words">{m.content}</span>
        </li>
      ))}
    </ol>
  );
};

const HandoffCard: React.FC<{ handoff: Handoff; defaultOpen: boolean }> = ({ handoff, defaultOpen }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [response, setResponse] = useState(handoff.admin_response ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (status: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.post(`/admin/handoffs/${handoff.id}`, { status, admin_response: response || null });
      qc.invalidateQueries({ queryKey: ['admin', 'handoffs'] });
    } catch (err) {
      setError(apiErrorMessage(err, 'Update failed'));
    } finally {
      setBusy(false);
    }
  };

  const who =
    handoff.org_name || handoff.visitor_email || (handoff.surface === 'app' ? 'Signed-in user' : 'Anonymous visitor');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 truncate">{who}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {handoff.surface === 'app' ? 'In-app' : 'Public site'} · {fmtDateTime(handoff.created_at)}
            {handoff.intent ? ` · intent: ${handoff.intent}` : ''}
            {handoff.sentiment && handoff.sentiment !== 'neutral' ? ` · ${handoff.sentiment}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {handoff.trigger && <Badge tone="red">{handoff.trigger.replace(/_/g, ' ')}</Badge>}
          <Badge tone={statusTone(handoff.status)}>{handoff.status.replace(/_/g, ' ')}</Badge>
        </div>
      </div>

      {handoff.narrative && <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{handoff.narrative}</p>}

      <AccountSnapshot account={handoff.account} />

      {handoff.suggested_resolution && (
        <div className="mt-2 text-sm text-gray-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <span className="text-[10px] font-bold uppercase tracking-wide text-green-700 block mb-0.5">Suggested resolution</span>
          <span className="whitespace-pre-wrap">{handoff.suggested_resolution}</span>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700"
      >
        {open ? 'Hide transcript' : 'Show transcript'}
      </button>

      {open && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <Transcript handoffId={handoff.id} initial={handoff.transcript} />
          <div className="mt-3">
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Reply / note (sent to the visitor by you)</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={3}
              placeholder="What you told the customer, or next steps…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {handoff.status !== 'in_progress' && (
              <button
                disabled={busy}
                onClick={() => save('in_progress')}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                Mark in progress
              </button>
            )}
            {handoff.status !== 'resolved' && (
              <ConfirmButton
                label="Resolve"
                confirmLabel="Confirm resolve"
                tone="green"
                busy={busy}
                onConfirm={() => save('resolved')}
                onError={(msg) => setError(msg)}
              />
            )}
            {handoff.status === 'resolved' && (
              <button
                disabled={busy}
                onClick={() => save('open')}
                className="border border-gray-300 hover:bg-gray-50 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-lg"
              >
                Reopen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const SupportTab: React.FC = () => {
  const qc = useQueryClient();
  const [searchParams] = useSearchParams();
  const deepLink = searchParams.get('handoff');
  const [status, setStatus] = useState<string>('open');
  const { data, isFetching } = useQuery({
    queryKey: ['admin', 'handoffs', status],
    queryFn: async () =>
      (await api.get<HandoffsPage>('/admin/handoffs', { params: { status: status || undefined, limit: 100 } })).data,
  });

  const counts = data?.counts ?? { open: 0, in_progress: 0, resolved: 0 };
  const items = data?.items ?? [];
  const chipCount = useMemo(
    () => ({ '': counts.open + counts.in_progress + counts.resolved, open: counts.open, in_progress: counts.in_progress, resolved: counts.resolved }),
    [counts],
  );
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (deepLink && cardRefs.current[deepLink]) {
      cardRefs.current[deepLink]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [deepLink, items.length]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { s: '', label: 'All' },
          { s: 'open', label: 'Open' },
          { s: 'in_progress', label: 'In progress' },
          { s: 'resolved', label: 'Resolved' },
        ].map(({ s, label }) => (
          <button
            key={s || 'all'}
            onClick={() => setStatus(s)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
              status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-blue-400'
            }`}
          >
            {label}
            {chipCount[s as keyof typeof chipCount] != null && (
              <span className="ml-1.5 opacity-70">{chipCount[s as keyof typeof chipCount]}</span>
            )}
          </button>
        ))}
        {isFetching && <Spinner />}
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ['admin', 'handoffs'] })}
          className="ml-auto text-xs text-gray-500 hover:text-gray-800 inline-flex items-center gap-1"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 bg-white border border-gray-200 rounded-xl p-5 text-sm">
          No {status ? status.replace(/_/g, ' ') : ''} handoffs. The bot resolves questions on its own and only escalates when it can't.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((h) => (
            <div key={h.id} ref={(el) => { cardRefs.current[h.id] = el; }}>
              <HandoffCard handoff={h} defaultOpen={h.id === deepLink} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
