import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/api';

export const Unsubscribe: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .get('/webhooks/unsubscribe', { params: { token } })
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-gray-200 rounded-xl p-8 max-w-md w-full text-center shadow-xs">
        <h1 className="text-xl font-bold text-gray-900 mb-2">GentleTap</h1>
        {status === 'loading' && <p className="text-sm text-gray-500">Processing your request…</p>}
        {status === 'ok' && (
          <p className="text-sm text-gray-700">
            You're unsubscribed. You won't receive further payment reminders at this address.
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-rose-600">This unsubscribe link is invalid or expired.</p>
        )}
      </div>
    </div>
  );
};
