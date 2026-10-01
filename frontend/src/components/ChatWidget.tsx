import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, UserRound } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

type Msg = {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  escalated?: boolean;
};

const VISITOR_KEY = 'gentletap_chat_visitor';
const SESSION_KEY = 'gentletap_chat_session';

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return 'v_unknown';
  }
}

const GREETING: Msg = {
  role: 'assistant',
  content:
    "Hi! I'm the GentleTap assistant. I can help with setup, pricing, features, integrations, " +
    "or anything about your account. What are you working on?",
};

export const ChatWidget: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const surface = isAuthenticated ? 'app' : 'public';

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Restore the session id when the surface matches (keeps context across reloads).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.surface === surface) setSessionId(parsed.id);
      }
    } catch {
      /* ignore */
    }
  }, [surface]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  // Allow other UI (e.g. the sidebar's Help & Docs) to open the chat.
  useEffect(() => {
    const open = () => setOpen(true);
    window.addEventListener('gentletap:open-chat', open);
    return () => window.removeEventListener('gentletap:open-chat', open);
  }, []);

  const persistSession = (id: string) => {
    setSessionId(id);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id, surface }));
    } catch {
      /* ignore */
    }
  };

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const url = surface === 'app' ? '/chat' : '/chat/public';
      const body: Record<string, unknown> = { message, page: location.pathname };
      if (sessionId) body.session_id = sessionId;
      if (surface === 'public') body.visitor_id = visitorId();
      const res = await api.post(url, body);
      const data = res.data;
      if (data.session_id && data.session_id !== sessionId) persistSession(data.session_id);
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.reply || "Sorry, I didn't catch that.",
          sources: data.sources,
          escalated: data.escalated,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: apiErrorMessage(err, 'Something went wrong. Please try again.') },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open GentleTap assistant"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg px-4 py-3 transition-colors"
        >
          <MessageCircle size={20} />
          <span className="text-sm font-semibold">Chat with us</span>
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="GentleTap assistant"
          className="fixed bottom-5 right-5 z-50 flex flex-col w-[calc(100vw-2.5rem)] max-w-sm h-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle size={18} />
              <div className="leading-tight">
                <div className="text-sm font-semibold">GentleTap Assistant</div>
                <div className="text-[11px] text-blue-100">AI helper · a human can jump in anytime</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat" className="p-1 rounded hover:bg-blue-700">
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ' +
                    (m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-sm')
                  }
                >
                  {m.content}
                  {m.escalated && (
                    <div className="mt-1 text-[11px] text-blue-700 flex items-center gap-1">
                      <UserRound size={12} /> Escalated to a human
                    </div>
                  )}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-1 text-[10px] text-gray-400">Sources: {m.sources.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-400">
                  typing…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-2 py-1">
            <button
              onClick={() => send('I’d like to talk to a human.')}
              className="text-[11px] text-blue-600 hover:text-blue-700 px-2 py-1"
            >
              Talk to a human
            </button>
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 px-3 py-2 border-t border-gray-200 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={surface === 'app' ? 'Ask about your account…' : 'Ask a question…'}
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send message"
              className="p-2 rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
