import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

/**
 * GoogleAuthCallback
 *
 * Google redirects the user here after consent:
 *   https://gentletap.co/auth/google/callback?code=...&state=...
 *
 * This page picks up the `code`, exchanges it with our backend,
 * stores the tokens, then forwards the user to /dashboard.
 */
export const GoogleAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Google sign-in was cancelled or denied. Please try again.');
      return;
    }

    if (!code) {
      setError('Missing authorization code from Google. Please try again.');
      return;
    }

    // Exchange code for tokens via our backend
    api
      .post(`/auth/google/callback?code=${encodeURIComponent(code)}`)
      .then((res) => {
        const data = res.data;
        setAuth({
          user: { id: data.user_id, email: data.email, full_name: data.full_name },
          orgId: data.org_id,
          orgName: data.org_name,
          plan: data.plan,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        });
        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'Google authentication failed. Please try again.');
      });
  }, [searchParams, setAuth, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
          <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-rose-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Authentication Failed</h2>
          <p className="text-sm text-rose-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 max-w-md w-full shadow-lg text-center">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto mb-4 animate-pulse">
          <Zap className="w-6 h-6 fill-white text-blue-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Signing you in…</h2>
        <p className="text-sm text-gray-500">Please wait while we verify your Google account.</p>
      </div>
    </div>
  );
};
